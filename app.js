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

// Read 
app.get("/", async(req,res)=>{
  const list = await db.query("SELECT* FROM expensetracker")
  try {

    res.render(list);

  } catch (error) {
    console.log("error" + error.message)
  }
});

//Create 
app.post("/add", async(req,res)=>{
   const dates = req.body.dates;
   const category = req.body.category;
   const expense = req.body.expense;
   
    await db.query('INSERT INTO expensetracker VALUES($1, $2, $3)',
    {
       dates,
       category,
       expense
    } 
  )
  res.redirect('/')
});

//Update 
app.patch("/", async(req,res)=>{
  //WE GOT A SERIOUS PROBLEM HERE.................................. 
   await db.query("UPDATE expensetracker SET '''SELECTED = VALUE ENTERED''' WHERE ....")
  })

//Delete
app.delete("/delete", async(req,res) =>{
  const id = req.params.id;
 await db.query('DELETE FROM expensetracker WHERE id = $1',{id})
 res.redirect('/')
});

//Log in 
app.post('sign up', (req ,res)=>{
  const password = req.body.password;
  const userName = req.body.userName;
})

client.end();

app.listen(port, ()=>
   {console.log(`server is running on port ${port}`)
});