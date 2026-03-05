const cron = require("node-cron")
const pool = require("../config/db")

cron.schedule("* * * * *", async () => {

try{

await pool.query(

`UPDATE numbers
SET status='available',
user_id=NULL,
reserved_at=NULL
WHERE status='reserved'
AND reserved_at < NOW() - INTERVAL '3 minutes'`

)

}catch(error){

console.log("Error liberando reservas", error)

}

})