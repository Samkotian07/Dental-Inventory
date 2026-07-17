import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronsDown } from "lucide-react";
import businessStat from "../assets/business-stat.svg";
import "./Carousel.css";

const slides = [
  {
    key: "issued",
    title: "Issued",
    copy: "See what's checked out to students right now.",
    to: "/issued",
  },
  {
    key: "exchange",
    title: "Exchange",
    copy: "Track items moving between departments and suppliers.",
    to: "/track-exchange",
  },
  {
    key: "inventory",
    title: "Inventory",
    copy: "The full stock count, updated as items move.",
    to: "/dashboard",
  },
];

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  const prev = () => setIndex((i) => (i === 0 ? slides.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === slides.length - 1 ? 0 : i + 1));
  const handleCardClick = (slide, i) => {
    setIndex(i);
    navigate(slide.to);
  };

  return (
    <section className="carousel" aria-label="Quick access shortcuts">
      <button className="carousel__arrow" onClick={prev} aria-label="Previous card">
        <ChevronLeft size={20} />
      </button>

      <div className="carousel__track">
        {slides.map((slide, i) => {
          const offset = i - index;
          let state = "far";
          if (offset === 0) state = "active";
          else if (Math.abs(offset) === 1 || Math.abs(offset) === slides.length - 1) state = "side";

          return (
            <article
              key={slide.key}
              className={`carousel__card carousel__card--${state}`}
              onClick={() => handleCardClick(slide, i)}
            >
              <div className="carousel__illustration">
                <img src={businessStat} alt="Business statistics illustration" />
              </div>

              <div className="carousel__body">
                <span className="carousel__eyebrow">Look into</span>
                <h3>{slide.title}</h3>
                {state === "active" && <p>{slide.copy}</p>}
              </div>
            </article>
          );
        })}
      </div>

      <button className="carousel__arrow" onClick={next} aria-label="Next card">
        <ChevronRight size={20} />
      </button>

      <div className="carousel__dots">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            className={`carousel__dot ${i === index ? "is-active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`Go to ${slide.title}`}
          />
        ))}
      </div>

      <button className="carousel__scroll-hint" aria-hidden="true">
        <ChevronsDown size={18} />
      </button>
    </section>
  );
}
