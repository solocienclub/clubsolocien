require("dotenv").config();

const express = require("express");
const pool = require("./config/db");

const rafflesRoutes = require("./routes/raffles");
const numbersRoutes = require("./routes/numbers");
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const paymentsRoutes = require("./routes/payments");


const cleanReservations = require("./jobs/cleanReservations");

const app = express();

/* =========================
MIDDLEWARE
========================= */

app.use(express.json());
app.use(express.static("public"));

/* =========================
RUTAS
========================= */

app.use("/payments", paymentsRoutes);
app.use("/admin", adminRoutes);
app.use("/numbers", numbersRoutes);
app.use("/auth", authRoutes);
app.use("/raffles", rafflesRoutes);
app.use("/users", usersRoutes);

/* =========================
LIMPIAR RESERVAS AUTOMATICO
========================= */

setInterval(async () => {

try{

await cleanReservations()

}catch(error){

console.log("Error limpiando reservas:",error)

}

},60000)

/* =========================
SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

console.log(`Servidor corriendo en puerto ${PORT}`);

});