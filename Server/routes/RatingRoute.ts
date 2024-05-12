import express, { Request, Response, Router } from "express";
const router: Router = express.Router();
import Rating from "../TSmodels/RatingModel.js";

//READ Route
router.get("/", async (request: Request, response: Response) => {
	try {
		const ratings = await Rating.find({ userID: request.session.user }).sort({ createdAt: 1 });
		if (ratings.length != 0) {
			response.status(200).json(ratings);
		} else {
			response.status(404).json({ message: "No ratings where found in the database" });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error while retrieving ratings from database :(" });
		}
	}
});

//READ ONE ROUTE
router.get("/:id", async (request: Request, response: Response) => {
	try {
		const rating = await Rating.findById(request.params.id);

		if (rating === null) {
			response.status(404).json({ message: `Rating with id ${request.params.id} not found in database` });
		}

		response.status(200).json(rating);
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error while retrieving rating from database :(" });
		}
	}
});

//CREATE ROUTE
router.post("/", async (request: Request, response: Response) => {
	const rating = new Rating({
		userID: request.session.user,
		moodRating: request.body.moodRating,
		message: request.body.message,
		createdAt: request.body.createdAt,
	});

	try {
		const newRating = await rating.save();

		response.status(201).json({ message: `Mood rating '${newRating._id}' has been saved successfully!` });
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Error occurred while creating new rating :(" });
		}
	}
});

//UPDATE ROUTE
router.patch("/:id", async (request: Request, response: Response) => {
	try {
		const rating = await Rating.findById(request.params.id);

		if (!rating) {
			return response.status(404).json({ errorMessage: "Rating not found" });
		}

		if (rating.moodRating != request.body.moodRating) {
			rating.moodRating = request.body.moodRating;
		}

		if (rating.message != request.body.message) {
			rating.message = request.body.message;
		}

		const updatedRating = await rating.save();

		response.status(200).json({ message: `Rating with the ID ${updatedRating._id} was updated successfully \n ${updatedRating}` });
	} catch (error) {
		if (error instanceof Error) {
			response.status(400).json({ errorMessage: error.message });
		} else {
			response.status(400).json({ errorMessage: "Server encountered error occurred while updating the rating :(" });
		}
	}
});

//DELETE ROUTE
router.delete("/:id", async (request: Request, response: Response) => {
	try {
		const rating = await Rating.findById(request.params.id);

		if (rating != null) {
			await rating.deleteOne({ ObjectId: rating._id });
			response.status(200).json({ message: `Rating with ID ${rating._id} was deleted successfully` });
		}
	} catch (error) {
		if (error instanceof Error) {
			response.status(500).json({ errorMessage: error.message });
		} else {
			response.status(500).json({ errorMessage: "Server encountered error occurred while deleting rating from database :(" });
		}
	}
});

//Export Rating Router
export default router;
