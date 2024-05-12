//Importing ExpressJS along with pre-defined types used for TypeScript's static type checking
import express, { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
const router: Router = express.Router();
import User from "../TSmodels/UserModel.js";

//CREATE USER ROUTE
router.post("/createUser", async (request: Request, response: Response) => {
	try {
		const username: string = request.body.username;
		const password: string = request.body.password;

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = new User({ username: username, hashedPassword: hashedPassword, tfjsCompatible: "not tested" });

		const newUser = await user.save();

		response.status(201).json({ message: `New User with id '${newUser._id}' has been created successfully!` });
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Error occurred while creating new User :(" });
		}
	}
});

//Get current user using request.session.user property
router.get("/", async (request: Request, response: Response) => {
	try {
		const user = await User.findById(request.session.user);

		if (user === null) {
			return response.status(404).json({ message: `User with id ${request.session.user} not found in database` });
		}

		//Removes the username, hashed password, and created at fields to ensure security
		const secureUserObject = { _id: user._id, tfjsCompatible: user.tfjsCompatible };
		response.status(200).json(secureUserObject);
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error while retrieving user from database :(" });
		}
	}
});

//UPDATE USER TFJS SUPPORT ROUTE
router.patch("/:id", async (request: Request, response: Response) => {
	try {
		const user = await User.findById(request.session.user);

		if (user === null) {
			return response.status(404).json({ message: `User with id ${request.session.user} not found in database` });
		}

		if (user.tfjsCompatible != request.body.tfjsCompatible) {
			user.tfjsCompatible = request.body.tfjsCompatible;
		}

		request.session.tfjsCompatible = user.tfjsCompatible;

		const updatedUser = await user.save();

		response.status(200).json({ message: `User with the ID ${request.session.user} was updated successfully \n ${updatedUser}` });
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Server encountered error occurred while updating the journal :(" });
		}
	}
});

//USER LOGIN ROUTE
router.post("/login", async (request: Request, response: Response) => {
	try {
		const username: string = request.body.username;
		const password: string = request.body.password;

		const users = await User.find();

		const user = users.find((user) => user.username === username);

		if (user == null) {
			return response.status(400).send(`Cannot find user with username ${username}`);
		}

		if (await bcrypt.compare(password, user.hashedPassword)) {
			request.session.user = user._id.toString();
			request.session.authentication = "true";
			request.session.tfjsCompatible = user.tfjsCompatible;

			response.status(200).json({ success: "Login valid" });
		} else {
			response.status(401).json({ error: "Invalid login details" });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Error occurred during user login process :(" });
		}
	}
});

//Export Journal Router
export default router;
