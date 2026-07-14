import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Download,
  Eye,
  FileQuestion,
  FileText,
  History,
  MapPin,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import Modal from "../components/Modal.jsx";

import {
  adminQueue,
  createProofRequest,
  getModerationActions,
  getProofFilesForReview,
  moderateClaim,
  moderateResponse,
  moderateReview,
  openProofFile,
  resolveFlag,
  revokeBarnClaimAsAdmin,
} from "../services/api.js";

const defaultProofMessage =
  "Please provide documentation reasonably supporting the specifically disputed factual statement. You may redact unrelated sensitive information.";

const actionConfig = {
  published: {
    title: "Publish this review?",
    button: "Publish review",
    className: "approve",
    defaultNote:
      "Approved after review under TheBarnInsider policies.",
  },

  changes_requested: {
    title: "Request changes from the reviewer",
    button: "Send change request",
    className: "btn-dark",
    defaultNote:
      "Please revise the review to address the concerns described below.",
  },

  proof_requested: {
    title: "Request supporting documentation",
    button: "Request proof",
    className: "btn-dark",
    defaultNote: defaultProofMessage,
  },

  rejected: {
    title: "Reject this submission?",
    button: "Reject review",
    className: "reject",
    defaultNote:
      "This submission cannot be published because it does not meet TheBarnInsider review standards.",
  },

  removed: {
    title: "Remove this review?",
    button: "Remove review",
    className: "reject",
    defaultNote: "Removed following a moderation review.",
  },
};

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(bytes) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size < 0) {
    return "Unknown size";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readableValue(value) {
  if (!value) {
    return "";
  }

  return value.replaceAll("_", " ");
}

function RatingSummary({ review }) {
  const rows = [
    ["Overall", review.rating_overall],
    ["Pay", review.rating_pay],
    ["Management", review.rating_management],
    ["Work-life", review.rating_work_life],
    ["Horse care", review.rating_horse_care],
    ["Safety", review.rating_safety],
    ["Growth", review.rating_growth],
    ["Housing", review.rating_housing],
  ];

  return (
    <div className="rating-summary">
      {rows.map(([label, value]) => (
        <div key={label}>
          <b>{value ?? "N/A"}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ProofPanel({
  reviewId,
  files,
  loading,
  onLoad,
  onOpen,
  busy,
}) {
  const hasLoaded = Array.isArray(files);

  return (
    <div className="proof-admin-panel">
      <div className="score-row">
        <div>
          <p className="eyebrow">Private supporting documentation</p>
          <h3>Reviewer proof</h3>
        </div>

        {!hasLoaded && (
          <button
            type="button"
            className="btn btn-light"
            disabled={loading || busy}
            onClick={() => onLoad(reviewId)}
          >
            <FileText />
            {loading ? "Loading proof…" : "Check for uploaded proof"}
          </button>
        )}

        {hasLoaded && (
          <button
            type="button"
            className="btn btn-light"
            disabled={loading || busy}
            onClick={() => onLoad(reviewId)}
          >
            <FileText />
            {loading ? "Refreshing…" : "Refresh proof"}
          </button>
        )}
      </div>

      {hasLoaded && files.length === 0 && (
        <p className="muted">
          No proof files have been uploaded for this review yet.
        </p>
      )}

      {hasLoaded && files.length > 0 && (
        <div className="proof-file-list">
          {files.map((file) => (
            <div className="proof-file-card" key={file.id}>
              <div>
                <b>{file.original_filename}</b>

                <small>
                  {file.mime_type || "Unknown file type"}
                  {" · "}
                  {formatFileSize(file.file_size_bytes)}
                  {" · "}
                  Uploaded {formatDate(file.created_at)}
                </small>

                {file.description && <p>{file.description}</p>}
              </div>

              <button
                type="button"
                className="btn btn-dark"
                disabled={busy}
                onClick={() => onOpen(file.storage_path)}
              >
                <Download />
                View proof
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [data, setData] = useState({
    reviews: [],
    published: [],
    removed: [],
    claims: [],
    responses: [],
    flags: [],
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);

  const [history, setHistory] = useState({
    review: null,
    rows: [],
    loading: false,
  });

  const [flagDecision, setFlagDecision] = useState(null);

  const [proofFiles, setProofFiles] = useState({});
  const [proofLoading, setProofLoading] = useState({});

  const load = async () => {
    setError("");

    try {
      setData(await adminQueue());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(
    () => ({
      reviews: data.reviews.length,
      flags: data.flags.length,
      claims: data.claims.filter((claim) => claim.status === "pending").length,
      responses: data.responses.length,
      published: data.published.length,
    }),
    [data]
  );

  const openDecision = (review, status) => {
    setDecision({ review, status });
    setNote(actionConfig[status].defaultNote);
  };

  const confirmDecision = async () => {
    if (!decision) {
      return;
    }

    if (note.trim().length < 10) {
      setError(
        "Please provide a clear moderation reason of at least 10 characters."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (decision.status === "proof_requested") {
        await createProofRequest(decision.review, note.trim());
      } else {
        await moderateReview(
          decision.review,
          decision.status,
          note.trim()
        );
      }

      setDecision(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const showHistory = async (review) => {
    setHistory({
      review,
      rows: [],
      loading: true,
    });

    try {
      const rows = await getModerationActions(review.id);

      setHistory({
        review,
        rows,
        loading: false,
      });
    } catch (err) {
      setHistory({
        review,
        rows: [],
        loading: false,
      });

      setError(err.message);
    }
  };

  const loadProofFiles = async (reviewId) => {
    setProofLoading((current) => ({
      ...current,
      [reviewId]: true,
    }));

    setError("");

    try {
      const files = await getProofFilesForReview(reviewId);

      setProofFiles((current) => ({
        ...current,
        [reviewId]: files,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setProofLoading((current) => ({
        ...current,
        [reviewId]: false,
      }));
    }
  };

  const handleOpenProof = async (storagePath) => {
    setBusy(true);
    setError("");

    try {
      await openProofFile(storagePath);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const revokeClaim = async (claim) => {
  const reason = window.prompt(
    `Why are you revoking the claim for ${claim.barn_name}?`
  );

  if (reason === null) {
    return;
  }

  if (reason.trim().length < 10) {
    setError("Please provide a revocation reason of at least 10 characters.");
    return;
  }

  setBusy(true);
  setError("");

  try {
    await revokeBarnClaimAsAdmin(claim, reason.trim());
    await load();
    window.alert("The employer claim has been revoked.");
  } catch (err) {
    setError(err.message);
  } finally {
    setBusy(false);
  }
};

  const decideClaim = async (claim, status) => {
    const reason = window.prompt(
      status === "approved"
        ? "Optional internal approval note:"
        : "Reason for rejecting this claim:"
    );

    if (reason === null) {
      return;
    }

    if (status === "rejected" && reason.trim().length < 10) {
      setError(
        "A rejection reason of at least 10 characters is required."
      );
      return;
    }

    setBusy(true);

    try {
      await moderateClaim(
        claim,
        status,
        reason.trim() || "Authority verified."
      );

      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const decideResponse = async (response, status) => {
    const reason = window.prompt(
      status === "published"
        ? "Optional internal approval note:"
        : "Reason for rejecting this employer response:"
    );

    if (reason === null) {
      return;
    }

    if (status === "rejected" && reason.trim().length < 10) {
      setError(
        "A rejection reason of at least 10 characters is required."
      );
      return;
    }

    setBusy(true);

    try {
      await moderateResponse(
        response,
        status,
        reason.trim() ||
          "Approved under employer response standards."
      );

      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmFlagResolution = async () => {
    if (!flagDecision) {
      return;
    }

    if (note.trim().length < 10) {
      setError(
        "Please provide a resolution note of at least 10 characters."
      );
      return;
    }

    setBusy(true);

    try {
      await resolveFlag(
        flagDecision.flag,
        flagDecision.status,
        note.trim()
      );

      setFlagDecision(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page container">
      <div className="page-head">
        <span className="eyebrow">
          Private owner administration
        </span>

        <h1>Moderation dashboard</h1>

        <p>
          Review submissions consistently, document every decision, and
          protect private reviewer information.
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats">
        <div>
          <b>{stats.reviews}</b>
          <span>Reviews requiring attention</span>
        </div>

        <div>
          <b>{stats.flags}</b>
          <span>Open reports</span>
        </div>

        <div>
          <b>{stats.claims}</b>
          <span>Claims pending</span>
        </div>

        <div>
          <b>{stats.responses}</b>
          <span>Responses pending</span>
        </div>

        <div>
          <b>{stats.published}</b>
          <span>Published reviews</span>
        </div>
      </div>

      <div className="dash-head top">
        <h2>Review queue</h2>
      </div>

      <div className="list">
        {data.reviews.map((review) => (
          <article className="content-card" key={review.id}>
            <div className="admin-review-header">
              <div>
                <p className="eyebrow">
                  {readableValue(review.status)} · {review.job_title}
                </p>

                <h3>{review.barns?.name}</h3>

                <div className="admin-meta">
                  <span>
                    <MapPin />
                    {[review.barns?.location_city, review.barns?.location_state]
                      .filter(Boolean)
                      .join(", ") || "Location not supplied"}
                  </span>

                  <span>
                    <Clock3 />
                    Submitted {formatDate(review.submitted_at)}
                  </span>

                  <span>
                    <UserRound />
                    Publicly shown as {review.public_name}
                  </span>
                </div>
              </div>

              <span className={`status ${review.status}`}>
                {readableValue(review.status)}
              </span>
            </div>

            <h3>{review.headline}</h3>
            <p>{review.experience}</p>

            <RatingSummary review={review} />

            <div className="chips">
              <span>{review.average_weekly_hours} hrs/week</span>

              <span>
                {review.pay_amount != null
                  ? `${review.currency} ${review.pay_amount}/${review.pay_basis}`
                  : "Pay not supplied"}
              </span>

              <span>
                Proof availability:{" "}
                {readableValue(review.proof_available)}
              </span>

              <span>{readableValue(review.employment_status)}</span>
            </div>

            {(review.status === "proof_requested" ||
              review.status === "under_review" ||
              proofFiles[review.id]) && (
              <ProofPanel
                reviewId={review.id}
                files={proofFiles[review.id]}
                loading={Boolean(proofLoading[review.id])}
                onLoad={loadProofFiles}
                onOpen={handleOpenProof}
                busy={busy}
              />
            )}

            <div className="mod-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setPreview(review)}
              >
                <Eye />
                Public preview
              </button>

              <button
                type="button"
                className="btn btn-light"
                onClick={() => showHistory(review)}
              >
                <History />
                Decision history
              </button>

              <button
                type="button"
                className="btn btn-light"
                disabled={busy || proofLoading[review.id]}
                onClick={() => loadProofFiles(review.id)}
              >
                <FileText />
                {proofLoading[review.id]
                  ? "Checking proof…"
                  : "View submitted proof"}
              </button>

              <button
                type="button"
                disabled={busy}
                className="btn approve"
                onClick={() => openDecision(review, "published")}
              >
                <Check />
                Publish
              </button>

              <button
                type="button"
                disabled={busy}
                className="btn btn-light"
                onClick={() =>
                  openDecision(review, "changes_requested")
                }
              >
                <FileQuestion />
                Request changes
              </button>

              <button
                type="button"
                disabled={busy}
                className="btn btn-light"
                onClick={() =>
                  openDecision(review, "proof_requested")
                }
              >
                <ShieldAlert />
                Request proof
              </button>

              <button
                type="button"
                disabled={busy}
                className="btn reject"
                onClick={() => openDecision(review, "rejected")}
              >
                <X />
                Reject
              </button>

              <button
                type="button"
                disabled={busy}
                className="btn reject"
                onClick={() => openDecision(review, "removed")}
              >
                <Trash2 />
                Remove
              </button>
            </div>
          </article>
        ))}

        {!data.reviews.length && (
          <div className="empty">The review queue is clear.</div>
        )}
      </div>

      <div className="dash-head top">
        <h2>Published reviews</h2>
      </div>

      <p className="muted admin-section-intro">
        Published reviews remain available here for post-publication
        moderation, proof requests, disputes, and removal.
      </p>

      <div className="list">
        {data.published.map((review) => (
          <article className="content-card" key={review.id}>
            <div className="admin-review-header">
              <div>
                <p className="eyebrow">
                  Published · {review.job_title}
                </p>

                <h3>{review.barns?.name}</h3>

                <div className="admin-meta">
                  <span>
                    <MapPin />
                    {[review.barns?.location_city, review.barns?.location_state]
                      .filter(Boolean)
                      .join(", ") || "Location not supplied"}
                  </span>

                  <span>
                    <Clock3 />
                    Published {formatDate(review.published_at)}
                  </span>

                  <span>
                    <UserRound />
                    Publicly shown as {review.public_name}
                  </span>
                </div>
              </div>

              <span className="status published">Published</span>
            </div>

            <h3>{review.headline}</h3>
            <p>{review.experience}</p>

            <RatingSummary review={review} />

            <div className="chips">
              <span>{review.average_weekly_hours} hrs/week</span>

              <span>
                {review.pay_amount != null
                  ? `${review.currency} ${review.pay_amount}/${review.pay_basis}`
                  : "Pay not supplied"}
              </span>

              <span>{readableValue(review.employment_status)}</span>
            </div>

            {proofFiles[review.id] && (
              <ProofPanel
                reviewId={review.id}
                files={proofFiles[review.id]}
                loading={Boolean(proofLoading[review.id])}
                onLoad={loadProofFiles}
                onOpen={handleOpenProof}
                busy={busy}
              />
            )}

            <div className="mod-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setPreview(review)}
              >
                <Eye />
                Public preview
              </button>

              <button
                type="button"
                className="btn btn-light"
                onClick={() => showHistory(review)}
              >
                <History />
                Decision history
              </button>

              <button
                type="button"
                className="btn btn-light"
                disabled={busy || proofLoading[review.id]}
                onClick={() => loadProofFiles(review.id)}
              >
                <FileText />
                {proofLoading[review.id]
                  ? "Checking proof…"
                  : "View submitted proof"}
              </button>

              <button
                type="button"
                disabled={busy}
                className="btn btn-light"
                onClick={() =>
                  openDecision(review, "proof_requested")
                }
              >
                <ShieldAlert />
                Request proof
              </button>

              <button
                type="button"
                disabled={busy}
                className="btn reject"
                onClick={() => openDecision(review, "removed")}
              >
                <Trash2 />
                Remove from public view
              </button>
            </div>
          </article>
        ))}

        {!data.published.length && (
          <p className="muted">No published reviews.</p>
        )}
      </div>

      <div className="dash-head top">
        <h2>Removed and withdrawn reviews</h2>
      </div>

      <div className="list">
        {data.removed.map((review) => (
          <article
            className="content-card compact-admin-card"
            key={review.id}
          >
            <div className="score-row">
              <div>
                <p className="eyebrow">
                  {readableValue(review.status)}
                </p>

                <h3>
                  {review.barns?.name}: {review.headline}
                </h3>
              </div>

              <span className={`status ${review.status}`}>
                {readableValue(review.status)}
              </span>
            </div>

            <p>
              {review.status === "withdrawn"
                ? "Deleted by the reviewer. Retained only as an internal audit record."
                : review.moderator_note || "Removed by moderation."}
            </p>

            <div className="mod-actions">
              <button
                type="button"
                className="btn btn-light"
                disabled={busy || proofLoading[review.id]}
                onClick={() => loadProofFiles(review.id)}
              >
                <FileText />
                {proofLoading[review.id]
                  ? "Checking proof…"
                  : "View submitted proof"}
              </button>

              {review.status === "removed" && (
                <>
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => showHistory(review)}
                  >
                    <History />
                    Decision history
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    className="btn approve"
                    onClick={() =>
                      openDecision(review, "published")
                    }
                  >
                    <Check />
                    Restore and publish
                  </button>
                </>
              )}
            </div>

            {proofFiles[review.id] && (
              <ProofPanel
                reviewId={review.id}
                files={proofFiles[review.id]}
                loading={Boolean(proofLoading[review.id])}
                onLoad={loadProofFiles}
                onOpen={handleOpenProof}
                busy={busy}
              />
            )}
          </article>
        ))}

        {!data.removed.length && (
          <p className="muted">
            No removed or withdrawn reviews.
          </p>
        )}
      </div>

      <div className="dash-head top">
        <h2>Open reports</h2>
      </div>

      <div className="list">
        {data.flags.map((flag) => (
          <article className="content-card" key={flag.id}>
            <div className="score-row">
              <span className="status flagged">
                {readableValue(flag.reason)}
              </span>

              <small>{formatDate(flag.created_at)}</small>
            </div>

            <h3>
              {flag.reviews?.barns?.name}:{" "}
              {flag.reviews?.headline}
            </h3>

            {flag.challenged_text && (
              <p>
                <b>Challenged text:</b> “{flag.challenged_text}”
              </p>
            )}

            <p>{flag.details}</p>

            <div className="mod-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  setFlagDecision({
                    flag,
                    status: "resolved_no_action",
                  });

                  setNote(
                    "Report reviewed. The content does not violate TheBarnInsider policy based on the information available."
                  );
                }}
              >
                Resolve—no action
              </button>

              <button
                type="button"
                className="btn reject"
                onClick={() => {
                  setFlagDecision({
                    flag,
                    status: "resolved_action_taken",
                  });

                  setNote(
                    "Report resolved after moderation action was taken on the associated content."
                  );
                }}
              >
                Resolve—action taken
              </button>
            </div>
          </article>
        ))}

        {!data.flags.length && (
          <p className="muted">No open reports.</p>
        )}
      </div>

      <div className="dash-head top">
        <h2>Employer claims</h2>
      </div>

      <p className="muted admin-section-intro">
        Review pending claims and revoke approved claims if a profile was
        claimed by the wrong person or organization.
      </p>

      <div className="list">
        {data.claims.map((claim) => (
          <article className="content-card" key={claim.id}>
            <div className="score-row">
              <h3>{claim.barn_name}</h3>

              <span className={`status ${claim.status}`}>
                {readableValue(claim.status)}
              </span>
            </div>

            <p>
              {claim.claimant_legal_name} · {claim.role_title} ·{" "}
              {claim.business_email}
            </p>

            {claim.explanation && <p>{claim.explanation}</p>}

            {claim.admin_note && (
              <div className="notice">
                <b>Administrative note</b>
                <p>{claim.admin_note}</p>
              </div>
            )}

            <div className="mod-actions">
              {claim.status === "pending" && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className="btn approve"
                    onClick={() => decideClaim(claim, "approved")}
                  >
                    Approve claim
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    className="btn reject"
                    onClick={() => decideClaim(claim, "rejected")}
                  >
                    Reject claim
                  </button>
                </>
              )}

              {claim.status === "approved" && (
                <button
                  type="button"
                  disabled={busy}
                  className="btn reject"
                  onClick={() => revokeClaim(claim)}
                >
                  Revoke claim
                </button>
              )}
            </div>
          </article>
        ))}

        {!data.claims.length && (
          <p className="muted">No pending or approved claims.</p>
        )}
      </div>

      <div className="dash-head top">
        <h2>Employer responses</h2>
      </div>

      <div className="list">
        {data.responses.map((response) => (
          <article className="content-card" key={response.id}>
            <h3>
              {response.barns?.name}: {response.reviews?.headline}
            </h3>

            <p>{response.response_body}</p>

            <div className="mod-actions">
              <button
                type="button"
                disabled={busy}
                className="btn approve"
                onClick={() =>
                  decideResponse(response, "published")
                }
              >
                Publish response
              </button>

              <button
                type="button"
                disabled={busy}
                className="btn reject"
                onClick={() =>
                  decideResponse(response, "rejected")
                }
              >
                Reject response
              </button>
            </div>
          </article>
        ))}

        {!data.responses.length && (
          <p className="muted">No pending responses.</p>
        )}
      </div>

      <Modal
        open={Boolean(decision)}
        title={decision ? actionConfig[decision.status].title : ""}
        danger={
          decision?.status === "rejected" ||
          decision?.status === "removed"
        }
        onClose={() => setDecision(null)}
        footer={
          decision && (
            <>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setDecision(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={busy}
                className={`btn ${actionConfig[decision.status].className}`}
                onClick={confirmDecision}
              >
                {busy
                  ? "Saving…"
                  : actionConfig[decision.status].button}
              </button>
            </>
          )
        }
      >
        {decision && (
          <>
            <p>
              <b>{decision.review.barns?.name}</b> — “
              {decision.review.headline}”
            </p>

            {(decision.status === "rejected" ||
              decision.status === "removed") && (
              <p className="danger-copy">
                This decision prevents the review from appearing
                publicly. Record a specific, policy-based reason.
              </p>
            )}

            <label className="action-note">
              Internal decision note / message to reviewer

              <textarea
                rows="5"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(preview)}
        title="Public review preview"
        onClose={() => setPreview(null)}
        footer={
          <button
            type="button"
            className="btn btn-dark"
            onClick={() => setPreview(null)}
          >
            Close preview
          </button>
        }
      >
        {preview && (
          <div className="preview-box">
            <div className="score-row">
              <b>{preview.rating_overall}/5 overall</b>
              <span className="pill">{preview.public_name}</span>
            </div>

            <p className="eyebrow">
              {preview.barns?.name} · {preview.job_title}
            </p>

            <h3>{preview.headline}</h3>
            <p>{preview.experience}</p>

            {preview.positives && (
              <div className="preview-section">
                <b>What worked well</b>
                <p>{preview.positives}</p>
              </div>
            )}

            {preview.improvements && (
              <div className="preview-section">
                <b>What could improve</b>
                <p>{preview.improvements}</p>
              </div>
            )}

            <RatingSummary review={preview} />
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(history.review)}
        title="Moderation history"
        onClose={() =>
          setHistory({
            review: null,
            rows: [],
            loading: false,
          })
        }
        footer={
          <button
            type="button"
            className="btn btn-dark"
            onClick={() =>
              setHistory({
                review: null,
                rows: [],
                loading: false,
              })
            }
          >
            Close
          </button>
        }
      >
        {history.review && (
          <>
            <p>
              <b>{history.review.barns?.name}</b> — “
              {history.review.headline}”
            </p>

            {history.loading ? (
              <p>Loading history…</p>
            ) : (
              <div className="audit-list">
                {history.rows.map((row) => (
                  <div className="audit-item" key={row.id}>
                    <b>{readableValue(row.action_type)}</b>

                    <small>
                      {formatDate(row.created_at)} ·{" "}
                      {row.previous_status || "none"} →{" "}
                      {row.new_status || "none"}
                    </small>

                    {row.internal_note && (
                      <p>{row.internal_note}</p>
                    )}
                  </div>
                ))}

                {!history.rows.length && (
                  <p className="muted">
                    No prior moderation actions are recorded for this
                    review.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(flagDecision)}
        title="Resolve this report"
        onClose={() => setFlagDecision(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setFlagDecision(null)}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={busy}
              className="btn btn-dark"
              onClick={confirmFlagResolution}
            >
              {busy ? "Saving…" : "Save resolution"}
            </button>
          </>
        }
      >
        <label>
          Resolution note

          <textarea
            rows="5"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </Modal>
    </section>
  );
}