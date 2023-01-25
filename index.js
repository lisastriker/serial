const serviceAccount = require('./key.json');
const path = require('path');
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const credentials = require("./key.json")
const serialNumbers = require("./serialNumber")
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const express = require("express");
const admin = require("firebase-admin");
const app = express();

require("dotenv").config();
var loggedIn = false;
app.use(express.static("static"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  const db = admin.firestore();


// Initialize Firebase
app.use(express.json())
app.engine("html", require("ejs").renderFile);
app.use(express.static("static"))
app.use(express.urlencoded({extended:true}))
app.use(bodyParser.json())
app.use(cors({ origin: '*', optionsSuccessStatus: 200 }))
app.use(cookieParser());
app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Expose-Headers", "*")
   //"Origin, X-Requested-With, Content-Type, Accept" x-access-token
   next();
 });
const auth = require("./middleware/auth");

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
})

app.get('/create/many', async(req,res) => {
  try {
  for(value of serialNumbers){
    db.collection("users").doc(value).set({firstName:""})
  }
  res.send("Added many");
  } catch(error){
    res.send(error)
  }
})


//Create warranty value
app.post('/create', async(req,res) => {
  if(serialNumbers.includes(req.body.serialNumber)){
    try{
      const userJson = {
        id : req.body.id,
        serialNumber : req.body.serialNumber,
        firstName : req.body.firstName,
        lastName : req.body.lastName,
        email : req.body.email,
        model : req.body.model,
        date : req.body.date,
        file : req.body.file
      }
      const response = db.collection("users").doc(req.body.serialNumber).set(userJson)
      const responseData = await db.collection("users").doc(req.body.serialNumber).get();
      console.log(response)
      res.send("Warranty Registered");
      } catch(error){
        res.sendStatus(401)
      }
  } else {
    res.status(401).send("Serial Number is wrong");
  }
  
})

//Get all info array
app.get('/read/all', auth, async(req,res) => {
  try{
    const userRef = db.collection("users")
    const response = await userRef.get();
    let responseArr = []
    response.forEach(doc => {
      responseArr.push(doc.data())
    })
    res.send(responseArr);
  } catch(error){
    res.send(error)
  }
})

//Find info pertaining to warranty serial number
app.get("/read/:serial",async(req,res) => {
  try{
    const userRef = db.collection("users").doc(req.params.serial)
    const response = await userRef.get();
    res.send(response.data());
  } catch(error){
    res.send(error)
  }
})

app.get("/userid", async(req,res) => {
  try{
    const arrayOfData = []
    const id = req.body.id
    const users = db.collection("users")
    const query = await users.where("id", "==", id).get()
    query.forEach(doc => {
      arrayOfData.push(doc.data())
      console.log(arrayOfData)
    });
    res.send(arrayOfData)
  }
  catch(error){
    res.send(error)
  }
})
//Search email function
app.get("/email", async(req,res) => {
  try{
    const arrayOfData = []
    const email = req.body.email
    const users = db.collection("users")
    const query = await users.where("email", "==", email).get()
    query.forEach(doc => {
      arrayOfData.push(doc.data())
    });
    res.send(arrayOfData)
  }
  catch(error){
    res.send(error)
  }
})

//Update the user with body text - id is warranty number, return error if serial number don't exist
app.put("/update/:serial", async(req,res) => {
  try{
    const id = req.params.serial.toString();
    const userRef = await db.collection("users").doc(id).update({
      firstName : req.body.firstName ,
      lastName : req.body.lastName,
      email : req.body.email,
    })
    const response = await db.collection("users").doc(id).get();
    res.send(response);
  } catch(error){
    res.send(error)
  }
})

//Authentication
app.post("/register", async (req, res) => {

  // Our register logic starts here
  try {
    // Get user input
    const { first_name, last_name, email, password } = req.body;

    // Validate user input
    if (!(email && password && first_name && last_name)) {
      res.status(400).send("All input is required");
    }
      
    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await db.collection("credentials").doc(req.body.email).get();
    console.log(oldUser.data())
    if (oldUser.data()) {
      return res.status(409).send("User Already Exist. Please Login");
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = {
      first_name,
      last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
    };
    const response = db.collection("credentials").doc(req.body.email).set(user)
    const responseData = await db.collection("credentials").doc(req.body.email).get();
    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );

    // return new user
    res.status(201).json(token);
  } catch (err) {
    console.log(err);
  }
  // Our register logic ends here
});

app.post("/login", async (req, res) => {

  // Our login logic starts here
  try {
    // Get user input
    const { email, password } = req.body;
    // Validate user input
    if (!(email && password)) {
      res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    const responseData = await db.collection("credentials").doc(req.body.email).get();
    let data = responseData.data();
    console.log('This is responseData' + JSON.stringify(data))
    if (data.email=="lisastriker@gmail.com" && await bcrypt.compare(password, data.password)) {
      // Create token
      const token = jwt.sign(
        { user_id: email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );
      res.status(200).json(token)
      // user
    } else {
      res.status(400).send("Invalid Credentials");
    }
  } catch (err) {
    console.log(err);
  }
});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`)
})
