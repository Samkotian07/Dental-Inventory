import { useState } from "react";
import Modal from "./Modal.jsx";

const courses = [
  "Dental Surgery",
  "Orthodontics",
  "Periodontics",
  "Endodontics",
  "Pediatric Dentistry",
];

const semesters = [
  { value: "1", label: "Sem I" },
  { value: "2", label: "Sem II" },
  { value: "3", label: "Sem III" },
  { value: "4", label: "Sem IV" },
  { value: "5", label: "Sem V" },
  { value: "6", label: "Sem VI" },
  { value: "7", label: "Sem VII" },
  { value: "8", label: "Sem VIII" },
];

export default function StudentFormModal({ student, onClose, onSave }) {
  const isEdit = Boolean(student);

  const [form, setForm] = useState({
    name: student?.name ?? "",
    campusId: student?.campusId ?? student?.id ?? "",
    email: student?.email ?? "",
    course: student?.course ?? courses[0],
    semester: student?.semester ?? semesters[0].value,
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const canSubmit = form.name.trim() && form.campusId.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave(student?.campusId ?? student?.id ?? null, {
      name: form.name.trim(),
      campusId: form.campusId.trim(),
      id: form.campusId.trim(),
      email: form.email.trim(),
      course: form.course,
      semester: form.semester,
    });
  };

  return (
    <Modal title={isEdit ? "Edit Student" : "Add Student"} onClose={onClose} width={460}>
      <div className="modal__field">
        <label htmlFor="student-name">Full Name</label>
        <input
          id="student-name"
          type="text"
          placeholder="John Doe"
          value={form.name}
          onChange={set("name")}
        />
      </div>

      <div className="modal__field">
        <label htmlFor="student-email">Email Address</label>
        <input
          id="student-email"
          type="email"
          placeholder="student@example.com"
          value={form.email}
          onChange={set("email")}
        />
      </div>

      <div className="modal__field-row">
        <div className="modal__field">
          <label htmlFor="student-campus-id">Campus ID</label>
          <input
            id="student-campus-id"
            type="text"
            placeholder="CS123"
            value={form.campusId}
            onChange={set("campusId")}
          />
        </div>

        <div className="modal__field">
          <label htmlFor="student-course">Course</label>
          <select id="student-course" value={form.course} onChange={set("course")}>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="modal__field">
        <label htmlFor="student-semester">Semester</label>
        <select id="student-semester" value={form.semester} onChange={set("semester")}>
          {semesters.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--primary" onClick={handleSubmit} disabled={!canSubmit}>
          {isEdit ? "Save Changes" : "Add Student"}
        </button>
      </div>
    </Modal>
  );
}
