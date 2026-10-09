export function canEditMemorialProfile(status) {
  return String(status || "").toLowerCase() !== "complete";
}

export function splitSubjectName(subjectName) {
  const parts = String(subjectName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

export function combineSubjectName(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
}

export function memorialProfileFormValues(memorial = {}) {
  const { firstName, lastName } = splitSubjectName(
    memorial.subject_name || memorial.deceased_name,
  );
  const biography =
    memorial.biography ||
    memorial.description ||
    memorial.brief_biography ||
    memorial.short_description ||
    "";

  return {
    firstName,
    lastName,
    nickName: memorial.nickname || memorial.nick_name || "",
    date_of_birth: memorial.date_of_birth || memorial.birth_date || "",
    date_of_passing: memorial.date_of_passing || memorial.death_date || "",
    briefBiography: biography,
    photoPreview: memorial.cover_photo_url || memorial.profile_photo_url || null,
  };
}
