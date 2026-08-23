import { useState } from "react";
import Modal from "./Modal.jsx";
import { courses, semesters } from "../../data/studentData.js";

export default function StudentFormModal({ student, onClose, onSave }) {
  const isEdit = Boolean(student);

  const [form, setForm] = useState({
    name: student?.name ?? "",
    campusId: student?.campusId ?? "",
    course: student?.course ?? courses[0],
    semester: student?.semester ?? semesters[0],
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const canSubmit = form.name.trim() && form.campusId.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave(student?.campusId ?? null, {
      name: form.name.trim(),
      campusId: form.campusId.trim(),
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
            <option key={s} value={s}>
              {s}
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
