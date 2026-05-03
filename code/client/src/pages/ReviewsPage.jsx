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
  const directionOptions = directionOptionsForRole(user.role);

  const completedAppointments = appointments.filter((appointment) => appointment.appointment_status === 'completed');

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
    if (appId && appointments.length > 0) {
      setForm({ ...emptyForm, app_id: appId, review_direction: directionOptions[0] });
      setModalOpen(true);
      navigate('/reviews', { replace: true });
    }
  }, [searchParams, appointments, directionOptions, navigate]);

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
            onClick={() => {
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

      <DataTable
        title="Review List"
        rows={filteredReviews}
        rowKey="review_id"
        loading={loading}
        columns={[
          { key: 'review_id', label: 'ID' },
          { key: 'app_id', label: 'Appointment' },
          { key: 'receiver_name', label: 'Receiver' },
          { key: 'provider_name', label: 'Provider' },
          { key: 'service_name', label: 'Service' },
          { key: 'rating', label: 'Rating', render: (row) => <RatingStars value={row.rating} /> },
          { key: 'review_direction', label: 'Direction', render: (row) => <StatusBadge value={row.review_direction} /> },
          { key: 'comment', label: 'Comment' }
        ]}
        actions={user.role === 'manager'
          ? (row) => (
            <button className="icon-button danger" type="button" onClick={() => setDeleteTarget(row)} aria-label="Delete review">
              <Trash2 size={16} />
            </button>
          )
          : null}
        emptyTitle="No reviews found"
        emptyDescription="Create a review for a completed appointment or adjust filters."
      />

      <Modal
        open={modalOpen}
        title="Create Review"
        description="Reviews are limited to one record per appointment and direction."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={submit} className="form-grid">
          <label>
            Completed Appointment
            <select value={form.app_id} onChange={(event) => setForm((current) => ({ ...current, app_id: event.target.value }))} required>
              <option value="">Select completed appointment</option>
              {completedAppointments.map((appointment) => (
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
            <button className="button ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="button primary" type="submit" disabled={submitting}>
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
