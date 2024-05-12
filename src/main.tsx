import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./css/mainStyle.css";

const router = createHashRouter([
	{
		path: "/*",
		element: <App />,
	},
]);

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
// 	<React.StrictMode>
// 		<HashRouter>
// 			<App />
// 		</HashRouter>
// 	</React.StrictMode>
// );

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);
