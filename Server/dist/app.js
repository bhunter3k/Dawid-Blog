//Importing Express JS library along with pre-defined types used for TypeScript's static type checking
import express from "express";
import cors from "cors";
import path from "path";
const __dirname = process.cwd();
//Create a new express application allowing us to setup our server
const app = express();
//Port which our server will listen on
const port = 5051;
//Middleware for parsing json
app.use(express.json());
//Middleware to allow the server and client to make requests from http://localhost:5050 and http://localhost:5051 origins
app.use(cors({
    credentials: true,
    origin: ["http://localhost:5050", "http://localhost:5051", "http://localhost:8182", "https://tpd20seu.projects.cmp.uea.ac.uk"],
}));
//Serve static files from the 'dist' folder in the Client directory
app.use(express.static(path.join(__dirname, "../../Client/dist")));
//Setting up routing for the server
import journalRoute from "./routes/JournalRoute.js";
app.use("/journal", journalRoute);
app.get("*", (request, response) => {
    response.sendFile(path.join(__dirname, "../../Client/dist", "index.html"));
});
//Server will listen on port 5050
app.listen(port, () => {
    console.log(`Server listening on port ${port} successfully!`);
});
