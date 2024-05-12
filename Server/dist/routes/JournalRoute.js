var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
//Importing ExpressJS along with pre-defined types used for TypeScript's static type checking
import express from "express";
const router = express.Router();
const __dirname = process.cwd();
// READ ALL ROUTE
router.get("/", (request, response) => __awaiter(void 0, void 0, void 0, function* () { }));
// READ ONE ROUTE
router.get("/:id", (request, response) => __awaiter(void 0, void 0, void 0, function* () { }));
// CREATE ROUTE
router.post("/", (request, response) => __awaiter(void 0, void 0, void 0, function* () { }));
// UPDATE ROUTE
router.patch("/:id", (request, response) => __awaiter(void 0, void 0, void 0, function* () { }));
// DELETE ROUTE
router.delete("/:id", (request, response) => __awaiter(void 0, void 0, void 0, function* () { }));
// Export Journal Router
export default router;
