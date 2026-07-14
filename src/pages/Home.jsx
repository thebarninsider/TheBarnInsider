import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  LockKeyhole,
  MessageSquareText,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react";

import { listPublishedReviews } from "../services/api.js";

const examples = [
  {
    id: "example-positive",
    barn: "Willow Crest Equestrian",
    role: "Groom",
    score: 5,
    headline: "Organized workplace with excellent horse care",
    body:
      "Fictional example: Expectations were communicated clearly, pay was timely, and horse-care standards were consistently high.",
  },
  {
    id: "example-constructive",
    barn: "Pine Ridge Sport Horses",
    role: "Working Student",
    score: 4,
    headline: "Excellent learning opportunity with demanding hours",
    body:
      "Fictional example: The learning opportunities were valuable, while competition-season hours were heavier than initially expected.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  const [real, setReal] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listPublishedReviews("", {
      page: 0,
      pageSize: 3,
    })
      .then((result) => {
        setReal(result.rows);
      })
      .catch(() => {
        setReal([]);
      });
  }, []);

  const cards = real.length ? real : examples;

  const handleSearch = (event) => {
    event.preventDefault();

    const cleanSearch = search.trim();

    if (cleanSearch) {
      navigate(`/reviews?search=${encodeURIComponent(cleanSearch)}`);
      return;
    }

    navigate("/reviews");
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">
              Workplace transparency for equestrians
            </span>

            <h1>Know the barn before you take the job.</h1>

            <p className="hero-sub">
              Read moderated, firsthand workplace experiences about pay,
              hours, housing, management, safety, horse care, and career
              growth.
            </p>

            <form className="hero-search" onSubmit={handleSearch}>
              <Search />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employers, barns, stables, farms, locations, or roles..."
              />

              <button type="submit" className="btn btn-dark">
                Search reviews
              </button>
            </form>

            <div className="hero-actions">
              <Link
                className="btn btn-dark"
                to="/signup?next=/submit-review"
              >
                Create account & share your experience
              </Link>

              <Link className="btn btn-light" to="/how-it-works">
                How moderation works
              </Link>
            </div>

            <div className="trust-row">
              <span>
                <LockKeyhole />
                Anonymous public posting
              </span>

              <span>
                <ClipboardCheck />
                Every review moderated
              </span>

              <span>
                <Scale />
                Fair dispute process
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-photo" />

            <div className="glass-card top-card">
              <b>Better information.</b>

              <span>
                Pay · Hours · Housing · Management · Horse care
              </span>
            </div>

            <div className="glass-card bottom-card">
              <ShieldCheck />

              <span>
                Reviews remain pending until they pass
                TheBarnInsider&apos;s moderation standards.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <span className="eyebrow">Designed for trust</span>

          <h2>
            Employees can speak honestly. Employers receive a fair
            process.
          </h2>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <MessageSquareText />

            <h3>Firsthand reviews</h3>

            <p>
              Reviewers certify that they are describing their own
              experience—not rumors or gossip.
            </p>
          </article>

          <article className="feature-card">
            <ClipboardCheck />

            <h3>Pre-publication moderation</h3>

            <p>
              Every submission stays private until an administrator
              approves it.
            </p>
          </article>

          <article className="feature-card">
            <Building2 />

            <h3>Verified employer participation</h3>

            <p>
              Approved representatives may respond and report specific
              policy concerns.
            </p>
          </article>

          <article className="feature-card">
            <ShieldCheck />

            <h3>Evidence-based disputes</h3>

            <p>
              Material factual disputes may trigger a confidential proof
              request.
            </p>
          </article>
        </div>
      </section>

      <section className="section soft">
        <div className="container">
          <div className="section-heading between">
            <div>
              <span className="eyebrow">
                Workplace experiences
              </span>

              <h2>
                {real.length
                  ? "Recently published reviews"
                  : "What reviews will look like"}
              </h2>

              {!real.length && (
                <p>
                  The two cards below are clearly labeled fictional
                  examples.
                </p>
              )}
            </div>

            <Link className="text-link" to="/reviews">
              Browse all
              <ArrowRight />
            </Link>
          </div>

          <div className="review-grid">
            {cards.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="score-row">
                  <b>
                    {review.rating_overall || review.score}/5
                  </b>

                  {!real.length && (
                    <span className="pill">
                      Fictional example
                    </span>
                  )}
                </div>

                <p className="eyebrow">
                  {review.barns?.name || review.barn} ·{" "}
                  {review.job_title || review.role}
                </p>

                <h3>{review.headline}</h3>

                <p>{review.experience || review.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading centered">
          <span className="eyebrow">The process</span>

          <h2>From submission to publication.</h2>
        </div>

        <div className="steps">
          <div>
            <span>01</span>

            <h3>Create an account</h3>

            <p>
              Confirm your email and keep private account details separate
              from your public review.
            </p>
          </div>

          <div>
            <span>02</span>

            <h3>Submit a specific review</h3>

            <p>
              Rate workplace categories and describe only your firsthand
              experience.
            </p>
          </div>

          <div>
            <span>03</span>

            <h3>Moderation review</h3>

            <p>
              Your submission remains pending while it is checked against
              platform policies.
            </p>
          </div>

          <div>
            <span>04</span>

            <h3>Publish or revise</h3>

            <p>
              Approved reviews become public; others may require
              clarification or proof.
            </p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-inner">
          <h2>
            Help the next equestrian understand the workplace before
            accepting the job.
          </h2>

          <Link
            className="btn btn-cream"
            to="/signup?next=/submit-review"
          >
            Get started
          </Link>
        </div>
      </section>
    </>
  );
}