"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const slides = [
  {
    src: "/assets/spaceoncall-fabrication-bay.webp",
    alt: "Modern fabrication bay with workbenches, power and loading access",
    label: "Fabrication bay"
  },
  {
    src: "/assets/spaceoncall-commercial-kitchen.webp",
    alt: "Commercial kitchen with stainless-steel work areas and extraction",
    label: "Commercial kitchen"
  },
  {
    src: "/assets/spaceoncall-popup-retail.webp",
    alt: "Flexible pop-up retail space with modular displays",
    label: "Pop-up retail"
  },
  {
    src: "/assets/spaceoncall-warehouse.webp",
    alt: "Warehouse and cargo workspace with loading shutters and storage racks",
    label: "Warehouse and cargo"
  }
] as const;

export function HeroSpaceCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const selectPrevious = () => setActive((current) => (current - 1 + slides.length) % slides.length);
  const selectNext = () => setActive((current) => (current + 1) % slides.length);

  return (
    <div
      className="hero-carousel"
      aria-label="Business spaces available on SpaceOnCall"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={index === active ? slide.alt : ""}
          className={`hero-stage__image hero-carousel__image${index === active ? " is-active" : ""}`}
          aria-hidden={index !== active}
        />
      ))}

      <div className="hero-carousel__controls">
        <button type="button" className="hero-carousel__arrow" onClick={selectPrevious} aria-label="Previous space">
          <ChevronLeft size={19} />
        </button>
        <div className="hero-carousel__status" aria-live="polite">
          <span>{slides[active].label}</span>
          <div className="hero-carousel__dots" aria-label="Choose space image">
            {slides.map((slide, index) => (
              <button
                key={slide.label}
                type="button"
                className={index === active ? "is-active" : ""}
                onClick={() => setActive(index)}
                aria-label={`Show ${slide.label}`}
                aria-current={index === active ? "true" : undefined}
              />
            ))}
          </div>
        </div>
        <button type="button" className="hero-carousel__arrow" onClick={selectNext} aria-label="Next space">
          <ChevronRight size={19} />
        </button>
      </div>
    </div>
  );
}
