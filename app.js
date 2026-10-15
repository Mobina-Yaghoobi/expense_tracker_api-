import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

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

//Log in 
app.post('sign up', (req ,res)=>{
  const password = req.body.password;
  const userName = req.body.userName;
})



app.listen(port, ()=>
   {console.log(`server is running on port ${port}`)
});

// req.body.password = encrypt(req.body.password); next();
  
  // try {
  //    isNaN(req.params.id) === true;
  //    const id = parseInt( req.params.id);

  // } catch (error) {
  //   res.status(400).json("wrong id")
  // }