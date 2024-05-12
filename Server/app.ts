//Importing Express JS library along with pre-defined types used for TypeScript's static type checking
import express, { Express, Response, Request, NextFunction, RequestHandler } from "express";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import session from "express-session";
import cors from "cors";
import path from "path";

const __dirname = process.cwd();

//Create a new express application allowing us to setup our server
const app: Express = express();
//Port which our server will listen on
// const port: number = 5051;
//UEA Domain Port
const port: number = 8182;

const dbConnection: string = "mongodb://127.0.0.1/thirdYearProject";
const dbUEAConnection: string = "mongodb://tpd20seu:uc2q6SIYlZf02kMutVKL@127.0.0.1";

//Connect to the thirdYearProject mongoDB database
mongoose.connect(dbUEAConnection, { dbName: "tpd20seu" });
//Connect to the UEA connection string and the tpd20seu database
// mongoose.connect(dbUEAConnection,{dbName:"tpd20seu"})
const db = mongoose.connection;
db.on("error", (error) => {
	console.error(error);
});
db.once("open", () => {
	console.log("Connected to MongoDB");
});

app.use(
	session({
		name: "userId",
		secret: "my-secret-key",
		resave: false,
		saveUninitialized: false,
		cookie: { maxAge: 1000 * 60 * 60 * 24, secure: false, httpOnly: true },
		store: MongoStore.create({
			mongoUrl: dbUEAConnection,
			collectionName: "sessions",
			// For UEA, might have to add dbName = "tpd20seu"
			dbName: "tpd20seu",
		}),
	})
);

//Middleware for parsing json
app.use(express.json());
//Middleware to allow the server and client to make requests from http://localhost:5050 and http://localhost:5051 origins
app.use(
	cors({
		credentials: true,
		origin: ["http://localhost:5050", "http://localhost:5051", "http://localhost:8182", "https://tpd20seu.projects.cmp.uea.ac.uk"],
	})
);
//Serve static files from the 'dist' folder in the Client directory
app.use(express.static(path.join(__dirname, "../../Client/dist")));

declare module "express-session" {
	export interface SessionData {
		user: string;
		authentication: string;
		tfjsCompatible: "true" | "false" | "not tested";
	}
}

const authenticationCheck: RequestHandler = (request: Request, response: Response, next: NextFunction) => {
	if (request.method === "GET" && request.path.includes("/models/")) {
		next();
	} else {
		if (request.session.authentication === "true" && request.session.user != null) {
			next();
		} else {
			response.status(401).json({ error: "Unauthorized" });
		}
	}
};

app.get("/authenticationCheck", authenticationCheck, (request: Request, response: Response) => {
	response.send("AuthenticationCheck middleware called");
});

//Setting up routing for the server
import userRoute from "./routes/UserRoute.js";
app.use("/user", userRoute);
import ratingRoute from "./routes/RatingRoute.js";
app.use("/rating", authenticationCheck, ratingRoute);
import journalRoute from "./routes/JournalRoute.js";
app.use("/journal", authenticationCheck, journalRoute);
import selfieRoute from "./routes/SelfieRoute.js";
app.use("/selfie", authenticationCheck, selfieRoute);
import recommendationsRoute from "./routes/RecommendationsRoute.js";
app.use("/recommendations", authenticationCheck, recommendationsRoute);
import statisticRoute from "./routes/StatisticsRoute.js";
app.use("/stats", authenticationCheck, statisticRoute);

app.get("*", (request, response) => {
	response.sendFile(path.join(__dirname, "../../Client/dist", "index.html"));
});

//Server will listen on port 5050
app.listen(port, () => {
	console.log(`Server listening on port ${port} successfully!`);
});
