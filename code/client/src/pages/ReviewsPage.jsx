import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, Star, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/useAuth';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ErrorAlert from '../components/common/ErrorAlert';
import Modal from '../components/common/Modal';
import PageHeader from '../components/common/PageHeader';
import SearchAndFilterBar from '../components/common/SearchAndFilterBar';
import { reviewDirections } from '../utils/constants';

const emptyForm = {
  app_id: '',
  rating: '5',
  review_direction: 'receiver_to_provider',
  comment: ''
};

function directionOptionsForRole(role) {
  if (role === 'receiver') {
    return ['receiver_to_provider'];
  }
  if (role === 'provider') {
    return ['provider_to_receiver'];
  }
  return reviewDirections;
}

function RatingStars({ value }) {
  const rating = Number(value || 0);
  return (
    <span className="stars" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={15} fill={index < rating ? '#f59e0b' : 'none'} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handledReviewParam = React.useRef('');
  const [reviews, setReviews] = React.useState([]);
  const [appointments, setAppointments] = React.useState([]);
  const [form, setForm] = React.useState(emptyForm);
  const [search, setSearch] = React.useState('');
  const [ratingFilter, setRatingFilter] = React.useState('');
  const [directionFilter, setDirectionFilter] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const directionOptions = React.useMemo(() => directionOptionsForRole(user.role), [user.role]);
  const canCreateReview = user.role !== 'manager';
  const activeDirection = user.role === 'manager' ? form.review_direction : directionOptions[0];

  const completedAppointments = appointments.filter((appointment) => appointment.appointment_status === 'completed');
  const reviewableAppointments = completedAppointments.filter((appointment) => !reviews.some((review) => (
    Number(review.app_id) === Number(appointment.app_id)
    && review.review_direction === activeDirection
  )));

  function closeModal() {
    setSubmitting(false);
    setError('');
    setForm({ ...emptyForm, review_direction: directionOptions[0] });
    setModalOpen(false);
  }

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [reviewRows, appointmentRows] = await Promise.all([
        api.reviews.list(),
        api.appointments.list()
      ]);
      setReviews(reviewRows);
      setAppointments(appointmentRows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  React.useEffect(() => {
    const appId = searchParams.get('new');
    if (!appId) {
      handledReviewParam.current = '';
      return;
    }
    if (loading || handledReviewParam.current === appId || appointments.length === 0) {
      return;
    }

    handledReviewParam.current = appId;
    const completedRows = appointments.filter((appointment) => appointment.appointment_status === 'completed');
    if (appId) {
      const direction = directionOptions[0];
      const canReviewAppointment = completedRows.some((appointment) => Number(appointment.app_id) === Number(appId))
        && !reviews.some((review) => Number(review.app_id) === Number(appId) && review.review_direction === direction);
      if (canReviewAppointment) {
        setForm({ ...emptyForm, app_id: appId, review_direction: direction });
        setModalOpen(true);
      } else {
        setError('This completed appointment has already been reviewed for your role.');
      }
      navigate('/reviews', { replace: true });
    }
  }, [searchParams, appointments, reviews, directionOptions, navigate, loading]);

  async function submit(event) {
    event.preventDefault();
    if (!form.app_id || Number(form.rating) < 1 || Number(form.rating) > 5) {
      setError('Completed appointment and rating from 1 to 5 are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setNotice('');
      await api.reviews.create({
        ...form,
        review_direction: user.role === 'manager' ? form.review_direction : directionOptions[0]
      });
      navigate('/reviews', { replace: true });
      setForm({ ...emptyForm, review_direction: directionOptions[0] });
      setModalOpen(false);
      setNotice('Review created successfully.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!deleteTarget) {
      return;
    }
    try {
      setError('');
      await api.reviews.remove(deleteTarget.review_id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredReviews = reviews.filter((review) => {
    const haystack = [
      review.receiver_name,
      review.provider_name,
      review.service_name,
      review.review_direction,
      review.comment
    ].join(' ').toLowerCase();
    return (
      (!search || haystack.includes(search.toLowerCase())) &&
      (!ratingFilter || String(review.rating) === ratingFilter) &&
      (!directionFilter || review.review_direction === directionFilter)
    );
  });
  const receiverToProviderReviews = filteredReviews.filter((review) => review.review_direction === 'receiver_to_provider');
  const providerToReceiverReviews = filteredReviews.filter((review) => review.review_direction === 'provider_to_receiver');
  const reviewColumns = [
    { key: 'review_id', label: 'ID' },
    { key: 'app_id', label: 'Appointment' },
    { key: 'receiver_name', label: 'Receiver' },
    { key: 'provider_name', label: 'Provider' },
    { key: 'service_name', label: 'Service' },
    { key: 'rating', label: 'Rating', render: (row) => <RatingStars value={row.rating} /> },
    { key: 'review_direction', label: 'Direction', render: (row) => <StatusBadge value={row.review_direction} /> },
    { key: 'comment', label: 'Comment' }
  ];
  const reviewActions = user.role === 'manager'
    ? (row) => (
      <button className="icon-button danger" type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete review">
        <Trash2 size={16} />
      </button>
    )
    : null;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Service quality"
        title="Reviews"
        description="Create and inspect appointment reviews from both directions."
        actions={(
          <button
            className="button primary"
            type="button"
            disabled={!canCreateReview}
            onClick={() => {
              setError('');
              setNotice('');
              setForm({ ...emptyForm, review_direction: directionOptions[0] });
              setModalOpen(true);
            }}
          >
            <MessageSquarePlus size={16} />
            New Review
          </button>
        )}
      />

      <ErrorAlert message={error} onClose={() => setError('')} />
      {notice && <div className="alert success">{notice}</div>}

      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search reviews"
        filters={(
          <>
            <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}>
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
            </select>
            <select value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value)}>
              <option value="">All directions</option>
              {reviewDirections.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
            </select>
          </>
        )}
      />

      {(!directionFilter || directionFilter === 'receiver_to_provider') && (
        <DataTable
          title="Receiver To Provider Reviews"
          description="Feedback written by receivers about provider service quality."
          rows={receiverToProviderReviews}
          rowKey="review_id"
          loading={loading}
          columns={reviewColumns}
          actions={reviewActions}
          emptyTitle="No receiver-to-provider reviews found"
          emptyDescription="Create a review for a completed appointment or adjust filters."
        />
      )}

      {(!directionFilter || directionFilter === 'provider_to_receiver') && (
        <DataTable
          title="Provider To Receiver Reviews"
          description="Feedback written by providers about receiver cooperation."
          rows={providerToReceiverReviews}
          rowKey="review_id"
          loading={loading}
          columns={reviewColumns}
          actions={reviewActions}
          emptyTitle="No provider-to-receiver reviews found"
          emptyDescription="Create a review for a completed appointment or adjust filters."
        />
      )}

      <Modal
        open={modalOpen}
        title="Create Review"
        description="Reviews are limited to one record per appointment and direction."
        onClose={closeModal}
      >
        <form onSubmit={submit} className="form-grid">
          <label>
            Completed Appointment
            <select value={form.app_id} onChange={(event) => setForm((current) => ({ ...current, app_id: event.target.value }))} required>
              <option value="">{reviewableAppointments.length ? 'Select completed appointment' : 'No reviewable completed appointments'}</option>
              {reviewableAppointments.map((appointment) => (
                <option key={appointment.app_id} value={appointment.app_id}>
                  #{appointment.app_id} {appointment.receiver_name} - {appointment.provider_name} - {appointment.service_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Direction
            <select
              value={form.review_direction}
              onChange={(event) => setForm((current) => ({ ...current, review_direction: event.target.value }))}
              disabled={directionOptions.length === 1}
            >
              {directionOptions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}
            </select>
          </label>
          <label>
            Rating
            <input type="number" min="1" max="5" step="1" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))} required />
          </label>
          <label>
            Comment
            <textarea rows="4" value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} />
          </label>
          <div className="form-actions end">
            <button className="button ghost" type="button" onClick={closeModal}>Cancel</button>
            <button className="button primary" type="submit" disabled={submitting || !reviewableAppointments.length}>
              {submitting ? 'Creating...' : 'Create Review'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete review"
        message={`Delete review #${deleteTarget?.review_id}? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
