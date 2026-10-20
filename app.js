import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

// Read 
app.get("/expense", async(req,res)=>{

  try {
   
    const list = await db.query("SELECT* FROM expenseTracker")
    res.status(200).json(list.rows);

  } catch (error) {
    console.log("error" + error.message)
    
     res.status(500).json({error: "Failed to retrieve expenses"});
  }
});

//Create 
app.post("/add", async(req,res)=>{
   const dates = req.body.dates;
   const category = req.body.category;
   const expense = req.body.expense;
   
   try {

      const newItem = await db.query('INSERT INTO expensetracker (dates, category, expense) VALUES($1, $2, $3) RETURNING *',
    [
       dates,
       category,
       expense
    ] 
    
  )
  console.log(newItem.rows);
  res.status(201).json(newItem.rows)

   } catch (error) {
    console.log("error"+ error.message);
   res.json({error: "something went wrong"});
   }

});

//Update 
app.patch("/edit/:id", async(req,res)=>{
  
   const id = parseInt( req.params.id);
  
  try {

       const updated = await db.query("UPDATE expensetracker SET dates=$1 , category=$2 , expense=$3 WHERE id = $4",
        [req.body.dates, 
        req.body.category,
        req.body.expense,
         id])
 
      res.status(200).json({message:"expense has been successfully updated"})

  } catch (error) {
    console.log(error.message);
     res.status(500).json({error: "something went wrong"});
    
  }

  })

//Delete
app.delete("/delete/:id", async(req,res) =>{
  const id = req.params.id;
  try {
    await db.query('DELETE FROM expensetracker WHERE id = $1',[id])
    res.status(200).json({message: "the expense has been deleted"})
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
           console.log(req.headers)

           //verifying JWT
           jwt.verify(token,process.env.JWT_secret,)
        
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

