document.addEventListener("DOMContentLoaded", () => {
  if (openDayData) initialize();

  document.getElementById("search").addEventListener("input", updateDisplay);
  document
    .getElementById("filter-topic")
    .addEventListener("change", updateDisplay);

  // Dark mode toggle
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

  // Load saved preference
  const savedPref = localStorage.getItem("darkMode") === "true";
  applyDarkModePreference(savedPref);
});

function initialize() {
  displayEventHeader(openDayData);
  populateTopicDropdown(openDayData.topics);
  displayFilteredTopicsAndPrograms(openDayData.topics);
}

function formatDateTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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
      <div class="event-meta">ID: ${event.id} | Type: ${
    event.type === "U" ? "Undergraduate" : "Postgraduate"
  }</div>
    </div>`;
}

function populateTopicDropdown(topics) {
  const topicSelect = document.getElementById("filter-topic");
  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic.id;
    option.textContent = topic.name;
    topicSelect.appendChild(option);
  });
}

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
      <div class="program-location">${generateLocationLinks(program)}</div>
      ${generateDescriptionToggle(program)}
      <div class="location-details"><strong>School:</strong> ${
        program.school.name
      }</div>
    </div>`;
}

window.toggleTopic = function (topicId) {
  const topicContent = document.getElementById(`topic-content-${topicId}`);
  topicContent.classList.toggle("hidden");
  const toggle =
    topicContent.previousElementSibling.querySelector(".collapse-toggle");
  toggle.textContent = topicContent.classList.contains("hidden") ? "▶" : "▼";
};

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
    </div>`;
  return topicElement;
}

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

function getAllPrograms(topics) {
  return topics.flatMap((topic) =>
    topic.programs.map((p) => ({
      ...p,
      topicId: topic.id,
      topicName: topic.name,
    }))
  );
}

function filterPrograms(allPrograms, searchTerm, topicId) {
  const search = searchTerm.toLowerCase();
  return allPrograms.filter((p) => {
    if (topicId !== "all" && p.topicId !== parseInt(topicId)) return false;
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

function updateDisplay() {
  const searchTerm = document.getElementById("search").value;
  const topicId = document.getElementById("filter-topic").value;
  const allPrograms = getAllPrograms(openDayData.topics);
  const filtered =
    searchTerm || topicId !== "all"
      ? filterPrograms(allPrograms, searchTerm, topicId)
      : allPrograms;
  displayFilteredTopicsAndPrograms(openDayData.topics, filtered);
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
  const showingLong = !longDesc.classList.contains("hidden");

  arrow.textContent = showingLong ? "▶" : "▼";
  shortDesc.classList.toggle("hidden", !showingLong);
  longDesc.classList.toggle("hidden", showingLong);
}

function generateDescriptionToggle(program) {
  return `
    <div class="program-description">
      <div class="description-header" onclick="toggleDescription(this)" style="cursor: pointer;">
        <span class="collapse-toggle">▶</span>
        <span class="short-description">${program.description_short}</span>
      </div>
      <div class="long-description hidden">${program.description}</div>
    </div>`;
}
