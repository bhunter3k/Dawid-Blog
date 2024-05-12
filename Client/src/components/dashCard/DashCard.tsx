import { Link } from "react-router-dom";

type featureProps = {
	feature: { Heading: string; Image: string; Summary: string; Link: string };
};

//Destructuring passed in feature prop from "props: featureProps" to "{ Header, Image, Summary }: featureProps)"
export const DashCard: React.FC<featureProps> = ({ feature }: featureProps) => {
	return (
		<>
			<div className="dashCard">
				<h3>{feature.Heading}</h3>
				<img src={feature.Image} alt="Picture" loading="lazy" />
				<p>
					<b>Summary:</b> {feature.Summary}
				</p>
				<Link to={feature.Link}>Click to view</Link>
			</div>
		</>
	);
};
