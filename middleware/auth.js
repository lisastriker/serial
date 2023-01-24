const jwt = require("jsonwebtoken");

const config = process.env;

function verifyToken(req,res,next){
  //Auth header value = > send token into header

  const bearerHeader = req.headers['authorization'];
  //check if bearer is undefined
  if(typeof bearerHeader !== 'undefined'){

      //split the space at the bearer
      const bearer = bearerHeader.split(' ');
      //Get token from string
      const bearerToken = bearer[1];

      //set the token
      req.token = bearerToken;

      //next middleweare
      next();

  }else{
      //Fobidden
      res.sendStatus(403);
  }

}

/*const verifyToken = (req, res, next) => {
  const token =
    req.body.token || req.query.token || req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    const decoded = jwt.verify(token, config.TOKEN_KEY);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
};*/

module.exports = verifyToken;