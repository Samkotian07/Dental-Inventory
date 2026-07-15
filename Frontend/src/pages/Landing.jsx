import Topbar from "../components/Topbar.jsx";
import Carousel from "../components/Carousel.jsx";
import { useMenuClick } from "../components/Layout.jsx";

export default function Landing() {
  const onMenuClick = useMenuClick();

  return (
    <>
      <Topbar onMenuClick={onMenuClick} />

      <main className="app__content">
        <div className="app__intro">
          <h1>Welcome back</h1>
          <p>Jump into issued items, active exchanges, or the full inventory.</p>
        </div>

        <Carousel />
      </main>
    </>
  );
}
