//It's better to type them as string instead of any:
//That way if you accidentally pass the image path to a thing that isn't expecting a string,
//you'll get type checking errors for it.
declare module "*.jpg" {
	const path: string;
	export default path;
}

declare module "*.png" {
	const path: string;
	export default path;
}

declare module "react-transition-group";

declare module "wink-lemmatizer";

declare module "pyscript-js";
