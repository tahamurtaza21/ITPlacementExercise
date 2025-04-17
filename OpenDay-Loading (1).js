// Wait for the DOM to fully load
document.addEventListener("DOMContentLoaded", () => {
  // Start initialization only if the data object exists
  if (openDayData) initialize();

  // Set up listeners for search and filters
  document.getElementById("search").addEventListener("input", updateDisplay);
  document.getElementById("filter-topic").addEventListener("change", updateDisplay);
  document.getElementById("filter-program-type").addEventListener("change", updateDisplay);

  // Dark mode toggle logic
  const toggleBtn = document.getElementById("toggle-dark-mode");
  function applyDarkModePreference(isDark) {
    document.body.classList.toggle("dark", isDark);
    toggleBtn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    localStorage.setItem("darkMode", isDark);
  }

  toggleBtn.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark");
    applyDarkModePreference(isDark);
  });

  // Load saved dark mode preference
  const savedPref = localStorage.getItem("darkMode") === "true";
  applyDarkModePreference(savedPref);
});

// Main initialization function
function initialize() {
  displayEventHeader(openDayData);
  populateTopicDropdown(openDayData.topics);
  populateProgramTypeDropdown(openDayData.topics);
  displayFilteredTopicsAndPrograms(openDayData.topics);
}

// Populate the topic dropdown based on the provided topics
function populateTopicDropdown(topics) {
  const topicSelect = document.getElementById("filter-topic");
  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic.id;
    option.textContent = topic.name;
    topicSelect.appendChild(option);
  });
}

// Populate the program type dropdown dynamically
function populateProgramTypeDropdown(topics) {
  const allPrograms = getAllPrograms(topics);
  const programTypeSet = new Set(allPrograms.map(p => p.programType.type));
  const typeSelect = document.getElementById("filter-program-type");
  programTypeSet.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });
}

// Get all programs from all topics
function getAllPrograms(topics) {
  return topics.flatMap((topic) =>
    topic.programs.map((p) => ({
      ...p,
      topicId: topic.id,
      topicName: topic.name,
    }))
  );
}

// Filter programs based on search input, topic and program type
function updateDisplay() {
  const searchTerm = document.getElementById("search").value;
  const topicId = document.getElementById("filter-topic").value;
  const programType = document.getElementById("filter-program-type").value;

  const allPrograms = getAllPrograms(openDayData.topics);
  const filtered = allPrograms.filter(p => {
    if (topicId !== "all" && p.topicId !== parseInt(topicId)) return false;
    if (programType !== "all" && p.programType.type !== programType) return false;
    if (!searchTerm) return true;
    const schoolName = p.school?.name?.toLowerCase() || "";
    return (
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description_short?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schoolName.includes(searchTerm.toLowerCase())
    );
  });

  displayFilteredTopicsAndPrograms(openDayData.topics, filtered);
}
