// Enhanced OpenDay-Loading.js with Modular Functions and Google Maps
// ------------------------------------------------------------
// This script loads and displays Open Day event data with search,
// filter, and sort capabilities. Enhanced with modular structure,
// inline comments, and external map links.

// Waits for the DOM to be fully loaded before initializing the page
// and attaching event listeners for search, filter, and sort
// dropdowns.
document.addEventListener("DOMContentLoaded", () => {
  if (openDayData) initialize();

  document.getElementById("search").addEventListener("input", updateDisplay);
  document
    .getElementById("filter-topic")
    .addEventListener("change", updateDisplay);

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
});

// Entry point: displays header, dropdown, and topic/program listings
function initialize() {
  displayEventHeader(openDayData);
  populateTopicDropdown(openDayData.topics);
  displayFilteredTopicsAndPrograms(openDayData.topics);
}

// Converts a datetime string into readable time format
function formatDateTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Combines start and end times into a formatted string
function formatDateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return `${start.toLocaleDateString("en-GB", options)} from ${formatDateTime(
    startStr
  )} to ${formatDateTime(endStr)}`;
}

// Displays the main Open Day event header with image and date/time
function displayEventHeader(event) {
  const headerContainer = document.getElementById("event-header");

  headerContainer.innerHTML = `
        <img src="${event.cover_image}" alt="${event.description}">
        <div class="event-header-info">
            <h1>${event.description}</h1>
            <div class="event-date">${formatDateRange(
              event.start_time,
              event.end_time
            )}</div>
            ${event.type === "U" ? "Undergraduate" : "Postgraduate"}</div>
        </div>
    `;
}

// Fills the topic dropdown with available topics
function populateTopicDropdown(topics) {
  const topicSelect = document.getElementById("filter-topic");

  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic.id;
    option.textContent = topic.name;
    topicSelect.appendChild(option);
  });
}

// Generates a single program card with all details and clickable map link
function createProgramCard(program) {
  return `
    <div class="program-card" data-program-id="${program.id}">
      <div class="program-type" style="background-color: ${
        program.programType.type_colour
      }; color: white;">
        ${program.programType.type}
      </div>
      <div class="program-title">${program.title}</div>
      <div class="program-time">
        ${formatDateTime(program.start_time)} - ${formatDateTime(
    program.end_time
  )}
      </div>
      <div class="program-location">
        ${generateLocationLinks(program)}
      </div>
      ${generateDescriptionToggle(program)}
      <div class="location-details">
        <strong>School:</strong> ${program.school.name}
      </div>
    </div>`;
}

// Toggles topic visibility on click (expands/collapses)
window.toggleTopic = function (topicId) {
  const topicContent = document.getElementById(`topic-content-${topicId}`);
  topicContent.classList.toggle("hidden");

  const toggle =
    topicContent.previousElementSibling.querySelector(".collapse-toggle");
  toggle.textContent = topicContent.classList.contains("hidden") ? "▶" : "▼";
};

// Creates a map of topic IDs to their filtered or full list of programs
function buildTopicProgramMap(topics, filteredPrograms) {
  const topicProgramMap = new Map();

  if (filteredPrograms) {
    filteredPrograms.forEach((program) => {
      if (!topicProgramMap.has(program.topicId)) {
        topicProgramMap.set(program.topicId, []);
      }
      topicProgramMap.get(program.topicId).push(program);
    });
  } else {
    topics.forEach((topic) => {
      topicProgramMap.set(topic.id, topic.programs);
    });
  }

  return topicProgramMap;
}

// Builds and returns the HTML structure for a topic and its programs
function createTopicElement(topic, programsForTopic) {
  const topicElement = document.createElement("div");
  topicElement.className = "topic";
  topicElement.dataset.topicId = topic.id;

  topicElement.innerHTML = `
        <div class="topic-header" onclick="toggleTopic(${topic.id})">
            <img src="${topic.cover_image}" alt="${topic.name}">
            <div class="topic-title">${topic.name}</div>
            <div class="collapse-toggle">▼</div>
        </div>
        <div id="topic-content-${topic.id}" class="topic-content">
            <div class="topic-description">${topic.description}</div>
            <div id="programs-container-${topic.id}" class="programs-container">
                ${
                  programsForTopic.length === 0
                    ? '<div class="no-programs">No programs in this topic match your search criteria.</div>'
                    : programsForTopic.map(createProgramCard).join("")
                }
            </div>
        </div>
    `;

  return topicElement;
}

// Renders the filtered or full set of topics and their program cards
function displayFilteredTopicsAndPrograms(topics, filteredPrograms = null) {
  const topicsContainer = document.getElementById("topics-container");
  topicsContainer.innerHTML = "";

  const topicProgramMap = buildTopicProgramMap(topics, filteredPrograms);

  topics.forEach((topic) => {
    const programs = topicProgramMap.get(topic.id) || [];
    if (filteredPrograms !== null && programs.length === 0) return;

    const topicElement = createTopicElement(topic, programs);
    topicsContainer.appendChild(topicElement);
  });

  if (topicsContainer.children.length === 0) {
    topicsContainer.innerHTML = `
            <div class="no-programs">No programs match your search criteria.</div>
        `;
  }
}

// Extracts all programs and enriches with topic metadata
function getAllPrograms(topics) {
  return topics.flatMap((topic) =>
    topic.programs.map((p) => ({
      ...p,
      topicId: topic.id,
      topicName: topic.name,
    }))
  );
}

// Filters the list of programs based on search term and selected topic
function filterPrograms(allPrograms, searchTerm, topicId) {
  const search = searchTerm.toLowerCase();
  return allPrograms.filter((program) => {
    if (topicId !== "all" && program.topicId !== parseInt(topicId))
      return false;
    if (!search) return true;

    const schoolName = program.school?.name?.toLowerCase() || "";

    return (
      program.title.toLowerCase().includes(search) ||
      program.description.toLowerCase().includes(search) ||
      program.description_short?.toLowerCase().includes(search) ||
      program.location.title.toLowerCase().includes(search) ||
      program.room?.toLowerCase().includes(search) ||
      schoolName.includes(search)
    );
  });
}

// Sorts programs based on selected sort criteria
function sortPrograms(programs, criteria) {
  return [...programs].sort((a, b) => {
    switch (criteria) {
      case "time":
        // Fix: use getTime() to ensure correct timestamp comparison
        return (
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      case "title":
        return a.title.localeCompare(b.title);
      case "location":
        return a.location.title.localeCompare(b.location.title);
      case "type":
        return a.programType.type.localeCompare(b.programType.type);
      default:
        return 0;
    }
  });
}

// Reacts to user input in search/filter/sort and refreshes view
function updateDisplay() {
  const searchTerm = document.getElementById("search").value;
  const topicId = document.getElementById("filter-topic").value;
  const sortCriteria = document.getElementById("sort").value;

  const allPrograms = getAllPrograms(openDayData.topics);
  const filtered =
    searchTerm || topicId !== "all"
      ? filterPrograms(allPrograms, searchTerm, topicId)
      : allPrograms;
  const sorted = sortPrograms(filtered, sortCriteria);

  displayFilteredTopicsAndPrograms(openDayData.topics, sorted);
}
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

function toggleDescription(header) {
  const container = header.closest(".program-description");
  const arrow = header.querySelector(".collapse-toggle");
  const shortDesc = header.querySelector(".short-description");
  const longDesc = container.querySelector(".long-description");

  // Toggle visibility of descriptions
  if (longDesc.classList.contains("hidden")) {
    // Show long description, hide short description
    arrow.textContent = "▼";
    shortDesc.classList.add("hidden");
    longDesc.classList.remove("hidden");
  } else {
    // Show short description, hide long description
    arrow.textContent = "▶";
    shortDesc.classList.remove("hidden");
    longDesc.classList.add("hidden");
  }
}

function generateDescriptionToggle(program) {
  return `
    <div class="program-description">
      <div class="description-header" onclick="toggleDescription(this)" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
        <span class="collapse-toggle">▶</span>
        <span class="short-description">${program.description_short}</span>
      </div>
      <div class="long-description hidden">${program.description}</div>
    </div>`;
}
