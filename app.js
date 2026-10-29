import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import jwt, { decode } from "jsonwebtoken";

const port = 3000;
const app = express();
env.config();



const db = new pg.Client({
  user: process.env.DB_User,
  host:  process.env.DB_Host ,
  database:  process.env.DB_Database,
  password: process.env.DB_Password,
  port:  process.env.DB_Port,
});
db.connect();


 app.use(bodyParser.urlencoded({ extended: true }));
 app.use(express.json());


 // a middleware function 
 function authenticateToken(req, res, next){
  if(req.headers.authorization === undefined){
    res.status(401).json({err: "athorization header is missing"})
    return 
  }
  const [type, enteredToken] = req.headers.authorization.split(" ");
  if(type !== "Bearer" || !enteredToken){
    res.status(401).json({err: "invalid authorization format"})
    return 
  }
  
 jwt.verify(enteredToken, process.env.JWT_secret, (err, decode)=>{

 if(err){

  res.status(401).json({err : "wrong token!"})
  return 

 }else{
  //decode ={ user_id: ... }
  req.user = decode;
  next();
 }
 })
}





// Read  filtering     
app.get("/expense", authenticateToken, async(req,res)=>{
 let list;
 //today's date
 const today = new Date();

  try {

  switch (req.query.filter) {
    case "week":
     var lastweek = new Date(today);
    lastweek.setDate(today.getDate()-7)
     list = await db.query("SELECT* FROM expenseTracker WHERE dates > $1  AND user_id=$2",
        [lastweek, req.user.user_Id ])

      break; 

    case "month":
       var lastMonth = new Date(today);
       lastMonth.setMonth(lastMonth.getMonth()-1)
       list = await db.query("SELECT* FROM expensetracker WHERE dates > $1 AND user_id=$2",
        [lastMonth, req.user.user_Id])
      break;

    case "3months":
       var last3Month = new Date(today);
       last3Month.setMonth(last3Month.getMonth()-3)
       list = await db.query("SELECT* FROM expensetracker WHERE dates > $1 AND user_id=$2",
       [last3Month, req.user.user_Id])
      break;

    case "custom":
      const startDate = //?
      const endDate = // ?
      list = await db.query("SELECT* FROM expenseTracker WHERE $1 <= dates AND dates <= $2 AND user_id=$3",
      [ startDate,
        endDate,
        req.user.user_Id])
      break;
    default:
        list = await db.query("SELECT* FROM expensetracker WHERE user_id=$1",
        [req.user.user_Id])
      break;
  }
     
    res.status(200).json(list.rows);

  } catch (error) {
    console.log("error" + error.message)
    
     res.status(500).json({error: "Failed to retrieve expenses"});
  }

});

//Create 
app.post("/add",authenticateToken, async(req,res)=>{
   const dates = req.body.dates;
   const category = req.body.category;
   const expense = req.body.expense;
   
   try {

      const newItem = await db.query('INSERT INTO expensetracker (dates, category, expense,user_id) VALUES($1, $2, $3, $4) RETURNING *',
    [
       dates,
       category,
       expense,
       req.user.user_Id
    ] 
    
  )
  console.log(newItem.rows);
  res.status(201).json(newItem.rows[0])

   } catch (error) {
    console.log("error: "+ error.message);
   res.status(500).json({error: "something went wrong"});
   }

});

//Update 
app.patch("/edit/:id",authenticateToken, async(req,res)=>{
  
   const id = Number( req.params.id);
   if(!Number.isInteger(id) || id <= 0){
    return res.status(400).json({err: "bad request"})
   }
  
  try {

       const updated = await db.query("UPDATE expensetracker SET dates=$1 , category=$2 , expense=$3 WHERE id = $4 AND user_id=$5 RETURNING*",
        [req.body.dates, 
        req.body.category,
        req.body.expense,
        id,
        req.user.user_Id
         ])
      if(updated.rowCount === 0){
        return res.status(404).json({err: "expense not found"})
      }
      res.status(200).json(updated.rows[0])

  } catch (error) {
    console.log(error.message);
     res.status(500).json({error: "something went wrong"});
    
  }

  })

//Delete
app.delete("/delete/:id",authenticateToken, async(req,res) =>{
    const id = Number( req.params.id);
    if(!Number.isInteger(id) || id <= 0){
    return res.status(400).json({err: "bad request"})
   }

  try {
    const deleted = await db.query('DELETE FROM expensetracker WHERE id = $1 AND user_id=$2',
      [id,
      req.user.user_Id]
    );
   if(deleted.rowCount === 0){
    return res.status(404).json({err: "expense not found!"})
   }
    return res.status(200).json({message: "the expense has been deleted"})
  } catch (error) {
    res.status(500).json({error: "something went wrong"})
  }
 

});

//sign up 
app.post('/signUp', async(req ,res)=>{
  const saltRounds = 10;
  const password = req.body.password;
  const userName = req.body.userName;
  let hashed_password = "";
 try {
   
  try {
     hashed_password = await bcrypt.hash(password,saltRounds)
  } catch (error) {
    res.status(500).json({err: "there is a problem in password security process!"})
    return;
  }
  

   await db.query("INSERT INTO users (user_name, password_hashed) VALUES($1, $2)",
  [userName, 
   hashed_password
  ]
 )
  res.status(200).json({message: " user has been succussfully signed up!"})

 } catch (error) {

  res.status(500).json({err: "oops! there was a problem signing up the user !"})
 }

 
});

//log In 
app.post("/logIn", async (req, res)=>{
const logIn_userName = req.body.userName;
const logIn_password = req.body.password;

try {

  let result = await db.query ("SELECT id, password_hashed FROM users WHERE user_name = $1",
  [logIn_userName])

  if(result.rows[0] === undefined){
    return res.status(400).json({err: "there is no such a username, register first!"})
  }

  console.log(typeof(result.rows[0].password_hashed))


     const comparision = await bcrypt.compare(logIn_password, result.rows[0].password_hashed)
     if (comparision){
        const userId = result.rows[0].id
       
          //signing JWT
           const token = jwt.sign(
           {user_Id: userId},
           process.env.JWT_secret,
           {expiresIn: 60 * 60})

           res.status(200).json({token : token});

     }
     else{
      res.status(400).json({err: "wrong password"})
     }

} catch (error) {
  res.status(500).json({message: "Server error!"})

}

});



app.listen(port, ()=>
   {console.log(`server is running on port ${port}`)
});

