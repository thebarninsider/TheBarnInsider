import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardCheck,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { submitReview } from "../services/api.js";
import Stars from "../components/Stars.jsx";

const fields = [
  ["overall", "Overall experience"],
  ["pay", "Pay & benefits"],
  ["management", "Management"],
  ["housing", "Housing, if provided"],
  ["workLife", "Work-life balance"],
  ["horseCare", "Horse care standards"],
  ["safety", "Workplace safety"],
  ["growth", "Learning & career growth"],
];

const initialForm = {
  barnName: "",
  location: "",
  discipline: "Hunter/Jumper",
  website: "",
  role: "",
  employmentStatus: "Former employee",
  tenure: "6–12 months",
  weeklyHours: "",
  payType: "Hourly",
  payAmount: "",
  currency: "USD",
  housing: "Not provided",
  headline: "",
  experience: "",
  positives: "",
  improvements: "",
  publicDisplay: "Anonymous",
  contactPermission: "Yes",
  proofAvailable: "Prefer not to say",
  wouldWorkAgain: "Prefer not to say",
  certifyFirsthand: false,
  certifyTruth: false,
  acceptPolicy: false,
};

export default function SubmitReview() {
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [ratings, setRatings] = useState(
    Object.fromEntries(fields.map(([key]) => [key, 4]))
  );

  const [form, setForm] = useState(initialForm);

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    setError("");

    if (form.experience.trim().length < 120) {
      setError(
        "Please provide at least 120 characters of firsthand detail."
      );
      return;
    }

    if (
      !form.certifyFirsthand ||
      !form.certifyTruth ||
      !form.acceptPolicy
    ) {
      setError("All certifications are required.");
      return;
    }

    setBusy(true);

    try {
      const review = await submitReview(form, ratings);

      navigate(`/submission-confirmation/${review.id}`);
    } catch (err) {
      setError(err.message || "Unable to submit your review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page container narrow">
      <div className="page-head centered">
        <span className="eyebrow">Write a review</span>

        <h1>Help others understand the workplace.</h1>

        <p>
          Be truthful, specific, professional, and limited to your own
          experience. Your review remains pending until approved.
        </p>
      </div>

      <div className="note-grid">
        <div>
          <LockKeyhole />
          <b>Private account details</b>
          <span>Email and phone are not displayed publicly.</span>
        </div>

        <div>
          <ClipboardCheck />
          <b>Pending moderation</b>
          <span>Nothing publishes automatically.</span>
        </div>

        <div>
          <ShieldCheck />
          <b>Proof may be requested</b>
          <span>Material claims may require private documentation.</span>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <form
        className="form-card review-form"
        onSubmit={handleSubmit}
      >
        <Section number="1" title="Employer information">
          <div className="form-grid">
            <label>
              Employer name

              <input
                required
                value={form.barnName}
                onChange={(event) =>
                  update("barnName", event.target.value)
                }
                placeholder="ie: Sky Farm, Smith Family Farm, or Jane Smith"
              />
            </label>

            <label>
              City and state/province

              <input
                required
                value={form.location}
                onChange={(event) =>
                  update("location", event.target.value)
                }
              />
            </label>

            <label>
              Primary discipline

              <select
                value={form.discipline}
                onChange={(event) =>
                  update("discipline", event.target.value)
                }
              >
                {[
                  "Hunter/Jumper",
                  "Eventing",
                  "Dressage",
                  "Polo",
                  "Racing",
                  "Breeding",
                  "Western",
                  "Boarding / lesson barn",
                  "Therapeutic riding",
                  "Other",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>

            <label>
              Website or public social page

              <input
                value={form.website}
                onChange={(event) =>
                  update("website", event.target.value)
                }
                placeholder="Optional"
              />
            </label>
          </div>
        </Section>

        <Section number="2" title="Your employment">
          <div className="form-grid">
            <label>
              Your role

              <input
                required
                value={form.role}
                onChange={(event) =>
                  update("role", event.target.value)
                }
              />
            </label>

            <label>
              Status

              <select
                value={form.employmentStatus}
                onChange={(event) =>
                  update("employmentStatus", event.target.value)
                }
              >
                {[
                  "Former employee",
                  "Current employee",
                  "Working student",
                  "Intern / apprentice",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>

            <label>
              Tenure

              <select
                value={form.tenure}
                onChange={(event) =>
                  update("tenure", event.target.value)
                }
              >
                {[
                  "Under 3 months",
                  "3–6 months",
                  "6–12 months",
                  "1–2 years",
                  "2-5 years",
                  "5+ years",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>

            <label>
              Average weekly hours

              <input
                required
                type="number"
                min="1"
                max="168"
                value={form.weeklyHours}
                onChange={(event) =>
                  update("weeklyHours", event.target.value)
                }
              />
            </label>

            <label>
              Pay basis

              <select
                value={form.payType}
                onChange={(event) =>
                  update("payType", event.target.value)
                }
              >
                <option>Hourly</option>
                <option>Monthly</option>
              </select>
            </label>

            <label>
              {form.payType === "Hourly"
                ? "Hourly pay"
                : "Monthly salary"}

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.payAmount}
                onChange={(event) =>
                  update("payAmount", event.target.value)
                }
              />
            </label>

            <label>
              Currency

              <select
                value={form.currency}
                onChange={(event) =>
                  update("currency", event.target.value)
                }
              >
                {["USD", "CAD", "GBP", "EUR", "AUD", "Other"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  )
                )}
              </select>
            </label>

            <label>
              Housing

              <select
                value={form.housing}
                onChange={(event) =>
                  update("housing", event.target.value)
                }
              >
                {[
                  "Not provided",
                  "Provided at no charge",
                  "Provided and deducted from pay",
                  "Provided for a separate fee",
                  "Promised but not provided",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
        </Section>

       <Section number="3" title="Rate the workplace">

  <label className="check">
    <input
      type="checkbox"
      checked={form.housing === "Not provided"}
      onChange={(event) => {
        if (event.target.checked) {
          update("housing", "Not provided");
        } else {
          update("housing", "Provided at no charge");
        }
      }}
    />

    <span>
      Housing was <strong>not provided</strong> by this employer.
    </span>
  </label>

  <div className="rating-grid">
    {fields
      .filter(([key]) => {
        if (
          key === "housing" &&
          form.housing === "Not provided"
        ) {
          return false;
        }

        return true;
      })
      .map(([key, label]) => (
        <label key={key}>
          {label}

          <Stars
            label={label}
            value={ratings[key]}
            onChange={(value) =>
              setRatings((current) => ({
                ...current,
                [key]: value,
              }))
            }
          />
        </label>
      ))}
  </div>
</Section>

        <Section number="4" title="Your firsthand experience">
          <label>
            Headline

            <input
              required
              minLength="5"
              maxLength="100"
              value={form.headline}
              onChange={(event) =>
                update("headline", event.target.value)
              }
            />

            <small>
              minimum 5
            </small>
          </label>

          <label>
            What should future employees know?

            <textarea
              required
              minLength="120"
              maxLength="5000"
              rows="9"
              value={form.experience}
              onChange={(event) =>
                update("experience", event.target.value)
              }
              placeholder="Describe what you personally experienced regarding pay, hours, housing, duties, management, safety, horse care, and whether the job matched what was represented."
            />

            <small>
              {form.experience.length}/5000 · minimum 120
            </small>
          </label>

          <label>
            What did the workplace do well?

            <textarea
              rows="4"
              maxLength="1500"
              value={form.positives}
              onChange={(event) =>
                update("positives", event.target.value)
              }
            />
          </label>

          <label>
            What could improve?

            <textarea
              rows="4"
              maxLength="1500"
              value={form.improvements}
              onChange={(event) =>
                update("improvements", event.target.value)
              }
            />
          </label>
        </Section>

        <Section number="5" title="Privacy and certifications">
          <div className="form-grid">
            <label>
              Public identity

              <select
                value={form.publicDisplay}
                onChange={(event) =>
                  update("publicDisplay", event.target.value)
                }
              >
                <option>Anonymous</option>
                <option>First name only</option>
                <option>Full name</option>
              </select>
            </label>

            <label>
              May we contact you about moderation?

              <select
                value={form.contactPermission}
                onChange={(event) =>
                  update("contactPermission", event.target.value)
                }
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </label>

            <label>
              Could you provide proof if requested?

              <select
                value={form.proofAvailable}
                onChange={(event) =>
                  update("proofAvailable", event.target.value)
                }
              >
                <option>Yes</option>
                <option>No</option>
                <option>Prefer not to say</option>
              </select>
            </label>

            <label>
              Would you work here again?

              <select
                value={form.wouldWorkAgain}
                onChange={(event) =>
                  update("wouldWorkAgain", event.target.value)
                }
              >
                <option>Yes</option>
                <option>No</option>
                <option>Prefer not to say</option>
              </select>
            </label>
          </div>

          <div className="warning">
            <AlertTriangle />

            <div>
              <b>Never include</b>

              <p>
                Threats, harassment, slurs, private contact information,
                home addresses, medical or immigration details, sexual
                rumors, confidential records, gossip, or accusations you
                know are false.
              </p>
            </div>
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={form.certifyFirsthand}
              onChange={(event) =>
                update("certifyFirsthand", event.target.checked)
              }
            />

            <span>
              I certify this review describes my own firsthand experience,
              not rumors or speculation.
            </span>
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={form.certifyTruth}
              onChange={(event) =>
                update("certifyTruth", event.target.checked)
              }
            />

            <span>
              I certify that my factual statements are true and accurate to
              the best of my knowledge. I understand that I am responsible
              for my words and that proof may be requested.
            </span>
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={form.acceptPolicy}
              onChange={(event) =>
                update("acceptPolicy", event.target.checked)
              }
            />

            <span>
              I agree to all TheBarnInsider policies and understand that
              submission does not guarantee publication.
            </span>
          </label>
        </Section>

        <button
          disabled={busy}
          className="btn btn-dark full"
          type="submit"
        >
          {busy ? "Submitting securely…" : "Submit for moderation"}
        </button>
      </form>
    </section>
  );
}

function Section({ number, title, children }) {
  return (
    <section>
      <div className="section-label">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>

      {children}
    </section>
  );
}