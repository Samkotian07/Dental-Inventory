import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronsDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import businessStat from "../assets/business-stat.svg";
import "./Carousel.css";

const slides = [
  {
    key: "issued",
    title: "Issued",
    copy: "See what's checked out to students right now.",
    to: "/issued",
    illustration: businessStat,
  },
  {
    key: "exchange",
    title: "Exchange",
    copy: "Track items moving between departments and suppliers.",
    to: "/track-exchange",
    illustration: businessStat,
  },
  {
    key: "inventory",
    title: "Inventory",
    copy: "The full stock count, updated as items move.",
    to: "/dashboard",
    illustration: businessStat,
  },
  {
    key: "analytics",
    title: "Analytics",
    copy: "Track usage patterns and optimize inventory flow.",
    to: "/analytics",
    illustration: businessStat,
  },
  {
    key: "reports",
    title: "Reports",
    copy: "Generate detailed reports on asset movement.",
    to: "/reports",
    illustration: businessStat,
  },
];

export default function Carousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState("next"); // 'next' or 'prev'
  const trackRef = useRef(null);
  const navigate = useNavigate();
  const totalSlides = slides.length;

  // Get visible slides (3 at a time) with position info
  const getVisibleSlides = () => {
    const visible = [];
    for (let i = -1; i <= 1; i++) {
      let index = (currentIndex + i + totalSlides) % totalSlides;
      visible.push({
        ...slides[index],
        originalIndex: index,
        position: i, // -1: left, 0: center, 1: right
      });
    }
    return visible;
  };

  // Smooth scroll with direction tracking
  const scrollToIndex = (index, dir = "next") => {
    if (isTransitioning) return;

    setDirection(dir);
    setIsTransitioning(true);
    setCurrentIndex(index);

    // Reset transitioning after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600); // Slightly longer for smoother feel
  };

  const handlePrev = () => {
    const newIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    scrollToIndex(newIndex, "prev");
  };

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % totalSlides;
    scrollToIndex(newIndex, "next");
  };

  const handleCardClick = (slide, index) => {
    if (index === currentIndex) {
      navigate(slide.to);
    } else {
      const dir = index > currentIndex ? "next" : "prev";
      scrollToIndex(index, dir);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  const visibleSlides = getVisibleSlides();

  return (
    <section className="carousel" aria-label="Quick access shortcuts">
      <button
        className="carousel__arrow"
        onClick={handlePrev}
        aria-label="Previous card"
        disabled={isTransitioning}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="carousel__track-wrapper">
        <div className="carousel__track" ref={trackRef}>
          {visibleSlides.map((slide, idx) => {
            let state = "side";
            let animationClass = "";

            if (slide.position === 0) {
              state = "active";
            }

            // Add direction-based animation classes
            if (isTransitioning) {
              if (direction === "next") {
                if (slide.position === 1) animationClass = "slide-in-right";
                if (slide.position === -1) animationClass = "slide-out-left";
              } else {
                if (slide.position === -1) animationClass = "slide-in-left";
                if (slide.position === 1) animationClass = "slide-out-right";
              }
            }

            return (
              <article
                key={`${slide.key}-${slide.position}`}
                className={`carousel__card carousel__card--${state} ${animationClass}`}
                onClick={() => handleCardClick(slide, slide.originalIndex)}
                style={{
                  transitionDelay: `${Math.abs(slide.position) * 0.05}s`,
                }}
              >
                <div className="carousel__illustration">
                  <img
                    src={slide.illustration}
                    alt={`${slide.title} illustration`}
                  />
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
      </div>

      <button
        className="carousel__arrow"
        onClick={handleNext}
        aria-label="Next card"
        disabled={isTransitioning}
      >
        <ChevronRight size={20} />
      </button>

      <div className="carousel__dots">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            className={`carousel__dot ${i === currentIndex ? "is-active" : ""}`}
            onClick={() => {
              const dir = i > currentIndex ? "next" : "prev";
              scrollToIndex(i, dir);
            }}
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
