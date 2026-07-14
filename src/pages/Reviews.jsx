import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { listPublishedReviews } from "../services/api.js";

const PAGE_SIZE = 12;

const disciplines = [
  "All disciplines",
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
];

export default function Reviews() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const [discipline, setDiscipline] = useState("All disciplines");
  const [stateFilter, setStateFilter] = useState("All locations");
  const [minimumRating, setMinimumRating] = useState("Any rating");

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadReviews = async ({
    nextPage = 0,
    append = false,
    search = submittedQuery,
  } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await listPublishedReviews(search, {
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setRows((current) => {
        if (!append) {
          return result.rows;
        }

        const existingIds = new Set(current.map((review) => review.id));

        return [
          ...current,
          ...result.rows.filter(
            (review) => !existingIds.has(review.id)
          ),
        ];
      });

      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err.message || "Unable to load published reviews.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadReviews({
      nextPage: 0,
      append: false,
      search: "",
    });
  }, []);

  const states = useMemo(() => {
    const values = rows
      .map((row) => row.barns?.location_state)
      .filter(Boolean);

    return [
      "All locations",
      ...Array.from(new Set(values)).sort(),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const disciplineMatch =
        discipline === "All disciplines" ||
        row.barns?.discipline === discipline;

      const stateMatch =
        stateFilter === "All locations" ||
        row.barns?.location_state === stateFilter;

      const ratingMatch =
        minimumRating === "Any rating" ||
        Number(row.rating_overall) >= Number(minimumRating);

      return disciplineMatch && stateMatch && ratingMatch;
    });
  }, [rows, discipline, stateFilter, minimumRating]);

  const handleSearch = async (event) => {
    event.preventDefault();

    const cleanQuery = query.trim();

    setSubmittedQuery(cleanQuery);
    setDiscipline("All disciplines");
    setStateFilter("All locations");
    setMinimumRating("Any rating");

    await loadReviews({
      nextPage: 0,
      append: false,
      search: cleanQuery,
    });
  };

  const handleLoadMore = async () => {
    await loadReviews({
      nextPage: page + 1,
      append: true,
      search: submittedQuery,
    });
  };

  const clearFilters = () => {
    setDiscipline("All disciplines");
    setStateFilter("All locations");
    setMinimumRating("Any rating");
  };

  return (
    <section className="page container">
      <div className="page-head">
        <span className="eyebrow">Employee reviews</span>

        <h1>Research the workplace—not just the job title.</h1>

        <p>
          Only employee reviews approved through TheBarnInsider&apos;s
          moderation process appear publicly.
        </p>
      </div>

      <form className="search" onSubmit={handleSearch}>
        <Search />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by employer, location, role, headline, or workplace experience..."
        />

        <button
          type="submit"
          className="btn btn-dark"
          disabled={loading}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="filter-bar" aria-label="Review filters">
        <div className="search-input-label">
          <SlidersHorizontal />
          Refine results
        </div>

        <select
          value={discipline}
          onChange={(event) => setDiscipline(event.target.value)}
          aria-label="Discipline filter"
        >
          {disciplines.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>

        <select
          value={stateFilter}
          onChange={(event) => setStateFilter(event.target.value)}
          aria-label="Location filter"
        >
          {states.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>

        <select
          value={minimumRating}
          onChange={(event) =>
            setMinimumRating(event.target.value)
          }
          aria-label="Minimum rating filter"
        >
          <option>Any rating</option>
          <option value="5">5 stars</option>
          <option value="4">4+ stars</option>
          <option value="3">3+ stars</option>
          <option value="2">2+ stars</option>
        </select>
      </div>

      {error && <div className="error top">{error}</div>}

      <div className="result-count">
        <p>
          {loading
            ? "Loading reviews…"
            : `${filtered.length} loaded published ${
                filtered.length === 1 ? "review" : "reviews"
              }`}
        </p>

        {(discipline !== "All disciplines" ||
          stateFilter !== "All locations" ||
          minimumRating !== "Any rating") && (
          <button
            type="button"
            className="muted-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="list">
        {loading ? (
          <div className="empty">
            Loading published reviews…
          </div>
        ) : (
          filtered.map((review) => (
            <Link
              className="review-row"
              to={`/barn/${review.barn_id}`}
              key={review.id}
            >
              <div className="review-score">
                {Number(review.rating_overall).toFixed(1)}
              </div>

              <div>
                <p className="eyebrow">
                  {review.barns?.name} · {review.job_title}
                </p>

                <h3>{review.headline}</h3>

                <p>{review.experience}</p>

                <div className="chips">
                  <span>{review.public_name}</span>

                  <span>
                    {review.average_weekly_hours} hrs/week
                  </span>

                  {review.pay_amount != null && (
                    <span>
                      {review.currency} {review.pay_amount}/
                      {review.pay_basis === "hourly"
                        ? "hour"
                        : "month"}
                    </span>
                  )}

                  {review.barns?.location_state && (
                    <span>
                      {review.barns.location_city},{" "}
                      {review.barns.location_state}
                    </span>
                  )}

                  {review.employment_verified && (
                    <span>
                      Employment relationship verified
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}

        {!loading && !filtered.length && (
          <div className="empty">
            <h3>No matching published reviews</h3>

            <p>
              Try clearing your filters or searching a different
              phrase.
            </p>
          </div>
        )}
      </div>

      {!loading && hasMore && (
        <div
          className="top"
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            className="btn btn-light"
            disabled={loadingMore}
            onClick={handleLoadMore}
          >
            {loadingMore ? "Loading more…" : "Load more reviews"}
          </button>
        </div>
      )}

      {!loading &&
        !hasMore &&
        rows.length > 0 && (
          <p
            className="muted top"
            style={{ textAlign: "center" }}
          >
            You have reached the end of the published reviews.
          </p>
        )}
    </section>
  );
}