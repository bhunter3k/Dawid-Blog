import express, { Request, Response, Router } from "express";
const router: Router = express.Router();

//READ Route
router.get("/", (request: Request, response: Response) => {
	response.send({ data: "Reading recommendation data" });
});

//CREATE ROUTE
router.post("/", (request: Request, response: Response) => {
	response.send({ data: "Creating new recommendation data" });
});

//UPDATE ROUTE
router.patch("/:id", (request: Request, response: Response) => {
	response.send({ data: "Updating recommendation data" });
});

//DELETE ROUTE
router.delete("/:id", (request: Request, response: Response) => {
	response.send({ data: "Deleting recommendation data" });
});

//Export Recommendations Router
export default router;
