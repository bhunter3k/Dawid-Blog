//Importing ExpressJS along with pre-defined types used for TypeScript's static type checking
import express, { Request, Response, Router } from "express";
const router: Router = express.Router();
import fs, { copyFileSync } from "fs";
import path from "path";

const __dirname = process.cwd();

// READ ALL ROUTE
router.get("/", async (request: Request, response: Response) => {});

// READ ONE ROUTE
router.get("/:id", async (request: Request, response: Response) => {});

// CREATE ROUTE
router.post("/", async (request: Request, response: Response) => {});

// UPDATE ROUTE
router.patch("/:id", async (request: Request, response: Response) => {});

// DELETE ROUTE
router.delete("/:id", async (request: Request, response: Response) => {});

// Export Journal Router
export default router;
