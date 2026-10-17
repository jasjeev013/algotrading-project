import AboutPanel from "../components/AboutPanel";

const AboutPage = () => (
  <>
    <h1 className="mb-1 text-[17px] font-bold">About QuantDash</h1>
    <p className="mb-5 text-[12.5px] text-muted-foreground">
      Reference guide for metrics, strategies, tickers, and platform concepts.
    </p>
    <AboutPanel />
  </>
);

export default AboutPage;
