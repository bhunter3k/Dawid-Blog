import express, { Request, Response, Router } from "express";
const router: Router = express.Router();

//READ Route
router.get("/", (request: Request, response: Response) => {
	response.send({ data: "Reading statistic data" });
});

//CREATE ROUTE
router.post("/", (request: Request, response: Response) => {
	response.send({ data: "Creating new statistic data" });
});

//UPDATE ROUTE
router.patch("/:id", (request: Request, response: Response) => {
	response.send({ data: "Updating statistic data" });
});

//DELETE ROUTE
router.delete("/:id", (request: Request, response: Response) => {
	response.send({ data: "Deleting statistic data" });
});

//Export Statistics Router
export default router;
