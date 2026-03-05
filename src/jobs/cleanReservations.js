const pool = require("../config/db")

async function cleanReservations(){

try{

await pool.query(`
UPDATE numbers
SET status='available',
user_id=NULL,
reserved_at=NULL
WHERE status='reserved'
AND reserved_at < NOW() - INTERVAL '3 minutes'
`)

}catch(error){

console.log("Error cleanReservations:",error)

}

}

module.exports = cleanReservations