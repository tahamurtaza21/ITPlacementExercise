// Wait until DOM is fully loaded before initializing
// Attach event listeners for search/filter and dark mode toggle
document.addEventListener("DOMContentLoaded", () => {
  if (openDayData) initialize();

  document.getElementById("search").addEventListener("input", updateDisplay);
  document
    .getElementById("filter-topic")
    .addEventListener("change", updateDisplay);
  document
    .getElementById("filter-program-type")
    .addEventListener("change", updateDisplay);

  const toggleBtn = document.getElementById("toggle-dark-mode");

  // Applies dark mode settings and saves preference in local storage
  function applyDarkModePreference(isDark) {
    document.body.classList.toggle("dark", isDark);
    toggleBtn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    localStorage.setItem("darkMode", isDark);
  }

  toggleBtn.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark");
    applyDarkModePreference(isDark);
  });

  const savedPref = localStorage.getItem("darkMode") === "true";
  applyDarkModePreference(savedPref);
});

// Initializes header, dropdowns, and program list
function initialize() {
  displayEventHeader(openDayData);
  populateTopicDropdown(openDayData.topics);
  populateProgramTypeDropdown(openDayData.topics);
  displayFilteredTopicsAndPrograms(openDayData.topics);
}

// Format a date-time string into a human-readable time
function formatDateTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Format event start and end range in a readable way
function formatDateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${start.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} from ${formatDateTime(startStr)} to ${formatDateTime(endStr)}`;
}

// Render the top banner with event metadata
function displayEventHeader(event) {
  const headerContainer = document.getElementById("event-header");
  headerContainer.innerHTML = `
    <figure style="display:flex">
      <img src="${event.cover_image}" alt="Event: ${event.description}">
      <figcaption class="event-header-info" style="padding:20px">
        <h1>${event.description}</h1>
        <div class="event-date">${formatDateRange(
          event.start_time,
          event.end_time
        )}</div>
        ${event.type === "U" ? "Undergraduate" : "Postgraduate"}</div>
      </figcaption>
    </figure>`;
}

// Populate dropdown menu with all available topics
function populateTopicDropdown(topics) {
  const topicSelect = document.getElementById("filter-topic");
  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic.id;
    option.textContent = topic.name;
    topicSelect.appendChild(option);
  });
}

function populateProgramTypeDropdown(topics) {
  const typeSelect = document.getElementById("filter-program-type");
  const types = new Map();

  topics.forEach((topic) =>
    topic.programs.forEach((program) =>
      types.set(program.programType.id, program.programType.type)
    )
  );

  types.forEach((type, id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = type;
    typeSelect.appendChild(option);
  });
}

// Generate HTML for a single program card
function createProgramCard(program) {
  return `
    <article class="program-card" data-program-id="${program.id}">
      <header>
        <div class="program-type" style="background-color: ${
          program.programType.type_colour
        }; color: white;">
          ${program.programType.type}
        </div>
        <h3 class="program-title">${program.title}</h3>
      </header>
      <section>
        <div class="program-time">${formatDateTime(
          program.start_time
        )} - ${formatDateTime(program.end_time)}</div>
        <div class="program-location">${generateLocationLinks(program)}</div>
        ${generateDescriptionToggle(program)}
      </section>
    </article>`;
}

// Collapse/expand functionality for topics
window.toggleTopic = function (topicId) {
  const topicContent = document.getElementById(`topic-content-${topicId}`);
  topicContent.classList.toggle("hidden");
  const toggle =
    topicContent.previousElementSibling.querySelector(".collapse-toggle");
  toggle.textContent = topicContent.classList.contains("hidden") ? "▶" : "▼";
};

// Organize programs under their topics, filtered or not
function buildTopicProgramMap(topics, filteredPrograms) {
  const map = new Map();
  if (filteredPrograms) {
    filteredPrograms.forEach((p) => {
      if (!map.has(p.topicId)) map.set(p.topicId, []);
      map.get(p.topicId).push(p);
    });
  } else {
    topics.forEach((topic) => map.set(topic.id, topic.programs));
  }
  return map;
}

// Build the topic element and its nested program cards
function createTopicElement(topic, programsForTopic) {
  const topicElement = document.createElement("section");
  topicElement.className = "topic";
  topicElement.dataset.topicId = topic.id;
  topicElement.innerHTML = `
    <header class="topic-header" onclick="toggleTopic(${
      topic.id
    })" aria-controls="topic-content-${topic.id}" aria-expanded="true">
      <img src="${topic.cover_image}" alt="Topic image: ${topic.name}">
      <h2 class="topic-title">${topic.name}</h2>
      <div class="collapse-toggle">▼</div>
    </header>
    <section id="topic-content-${topic.id}" class="topic-content">
      <p class="topic-description">${topic.description}</p>
      <div id="programs-container-${topic.id}" class="programs-container">
        ${
          programsForTopic.length === 0
            ? '<div class="no-programs">No programs in this topic match your search criteria.</div>'
            : programsForTopic.map(createProgramCard).join("")
        }
      </div>
    </section>`;
  return topicElement;
}

// Display programs and topics based on current filters
function displayFilteredTopicsAndPrograms(topics, filteredPrograms = null) {
  const container = document.getElementById("topics-container");
  container.innerHTML = "";
  const topicProgramMap = buildTopicProgramMap(topics, filteredPrograms);
  topics.forEach((topic) => {
    const programs = topicProgramMap.get(topic.id) || [];
    if (filteredPrograms !== null && programs.length === 0) return;
    container.appendChild(createTopicElement(topic, programs));
  });
  if (container.children.length === 0) {
    container.innerHTML =
      '<div class="no-programs">No programs match your search criteria.</div>';
  }
}

// Flatten all programs across topics for easy filtering
function getAllPrograms(topics) {
  return topics.flatMap((topic) =>
    topic.programs.map((p) => ({
      ...p,
      topicId: topic.id,
      topicName: topic.name,
    }))
  );
}

// Filter based on search term and topic dropdown
function filterPrograms(allPrograms, searchTerm, topicId, programTypeId) {
  const search = searchTerm.toLowerCase();
  return allPrograms.filter((p) => {
    if (topicId !== "all" && p.topicId !== parseInt(topicId)) return false;
    if (programTypeId !== "all" && p.programType.id !== parseInt(programTypeId))
      return false;
    if (!search) return true;
    const schoolName = p.school?.name?.toLowerCase() || "";
    return (
      p.title.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search) ||
      p.description_short?.toLowerCase().includes(search) ||
      p.location.title.toLowerCase().includes(search) ||
      p.room?.toLowerCase().includes(search) ||
      schoolName.includes(search)
    );
  });
}

// Refresh program list on input/filter change
function updateDisplay() {
  const searchTerm = document.getElementById("search").value;
  const topicId = document.getElementById("filter-topic").value;
  const programTypeId = document.getElementById("filter-program-type").value;

  const allPrograms = getAllPrograms(openDayData.topics);
  const filtered =
    searchTerm || topicId !== "all" || programTypeId !== "all"
      ? filterPrograms(allPrograms, searchTerm, topicId, programTypeId)
      : allPrograms;

  displayFilteredTopicsAndPrograms(openDayData.topics, filtered);
}

// Generates location info and Google Maps link
function generateLocationLinks(program) {
  return `
    <a href="${
      program.location.website
    }" target="_blank" rel="noopener noreferrer">
      ${program.location.title}${program.room ? `, ${program.room}` : ""}
    </a><br>
    <a href="https://www.google.com/maps/search/?api=1&query=${
      program.location.latitude
    },${program.location.longitude}" target="_blank" rel="noopener noreferrer">
      Map Location
    </a>`;
}

// Toggle between short and long description
function toggleDescription(header) {
  const container = header.closest(".program-description");
  const arrow = header.querySelector(".collapse-toggle");
  const shortDesc = header.querySelector(".short-description");
  const longDesc = container.querySelector(".long-description");
  const showingLong = !longDesc.classList.contains("hidden");

  arrow.textContent = showingLong ? "▶" : "▼";
  shortDesc.classList.toggle("hidden", !showingLong);
  longDesc.classList.toggle("hidden", showingLong);
}

// Generate HTML structure for expandable description
function generateDescriptionToggle(program) {
  return `
    <section class="program-description">
      <header class="description-header" onclick="toggleDescription(this)" role="button" aria-expanded="false" aria-controls="desc-${program.id}" tabindex="0">
        <span class="collapse-toggle">▶</span>
        <span class="short-description">${program.description_short}</span>
      </header>
      <div id="desc-${program.id}" class="long-description hidden">${program.description}</div>
    </section>`;
}
