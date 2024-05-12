export { Login } from "./login/Login";
export { Home } from "./home/HomePage";
export { default as Dashboard } from "./dashboard/Dashboard";
//Predictions are made using TensorFLow.js in the browser if the user's device supports this
export { MoodJournalTFJS } from "./moodJournal/MoodJournalTFJS";
export { MoodJournalBackend } from "./moodJournal/MoodJournalBackend";
//Predictions are made in the backend if the user's device does not support TensorFlow.js
export { MoodSelfieTFJS } from "./moodSelfie/MoodSelfieTFJS";
export { MoodSelfieBackend } from "./moodSelfie/MoodSelfieBackend";
export { RateMood } from "./rateMood/RateMood";
export { Recommendations } from "./recommendations/Recommendations";
export { StatsTrends } from "./stats&Trends/Stats&Trends";
export { AboutMe } from "./aboutMe/AboutMe";
export { Contact } from "./contact/Contact";
