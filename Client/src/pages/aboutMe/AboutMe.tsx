export const AboutMe = () => {
	return (
		<>
			<h1>About Me</h1>
			<h2>Just a short about me section.</h2>
			<hr />
			<div id="aboutMeContainer">
				<img id="dawidPhotoImg" src={"/dawidPhoto.jpg"}></img>

				<p id="aboutMeP">
					Hello. My name is Dawid Klos, and I am a final-year student at the University of East Anglia. I want to thank you so much for agreeing to
					test my website.
					<br />
					<br />
					As part of my final year, I had the opportunity to choose a project to work on. This project is similar to a dissertation students must
					write in other degrees, but it is a Computing Science version. I decided to take the opportunity to pursue my passion for web development
					and chose to work on the "You Are Not Your Thoughts!" project.
					<br />
					<br />
					Although challenging at times, this project has been transformational in my journey as a programmer. It has opened my eyes to many new
					concepts and forced me to challenge myself in ways I would have never guessed I could overcome before I started. The project has enabled me
					to delve into concepts such as Machine Learning, Web Hosting, Security, Database Management, React, and more.
					<br />
					<br />I hope you find some use for this website, and I look forward to your feedback :)
				</p>
			</div>
		</>
	);
};
