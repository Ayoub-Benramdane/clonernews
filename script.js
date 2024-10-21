let currentOffset = 0
const sizePage = 20
let [postStoryIds, postJobIds, postPollIds, idsToDisplay] = [[], [], [], []]
let selectedType = "newstories"

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

async function fetchItems(type) {
  const response = await fetch(
    `https://hacker-news.firebaseio.com/v0/${type}.json`
  )
  return await response.json()
}

async function fetchItemDetails(itemId) {
  const response = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`
  )
  return await response.json()
}

async function loadPosts(type) {
  const loadingElement = document.getElementById("loading")
  loadingElement.style.display = "block"

  const storyIds = await fetchItems("newstories")
  const jobIds = await fetchItems("jobstories")
  const pollIds = await fetchItems("topstories")
  postStoryIds = [...storyIds]
  postJobIds = [...jobIds]
  postPollIds = [...pollIds]
  try {
    switch (type) {
      case "newstories":
        idsToDisplay = postStoryIds
        break
      case "jobstories":
        idsToDisplay = postJobIds
        break
      case "topstories":
        idsToDisplay = postPollIds
        break
    }

    const newPosts = await Promise.all(
      idsToDisplay.slice(currentOffset, currentOffset + sizePage).map(fetchItemDetails)
    )

    displayPosts(newPosts)
    currentOffset += sizePage
    if (currentOffset >= idsToDisplay.length) document.getElementById("load-more").style.display = "none"

  } catch (error) {
    console.error("Error loading posts:", error)
  }
  loadingElement.style.display = "none"
}

document.getElementById("post-type").addEventListener("change", (event) => {
  currentOffset = 0
  document.getElementById("feed").innerHTML = ""
  loadPosts(event.target.value)
})

async function loadComments(postId) {
  const post = await fetchItemDetails(postId)
  if (post.kids) {
    const comments = await Promise.all(post.kids.map(fetchItemDetails))
    return comments
  }
  return []
}

function displayPosts(posts) {
  const feed = document.getElementById("feed")
  posts.forEach((post) => {
    if (post) {
      const postElement = document.createElement("div")
      postElement.classList.add("post")
      postElement.innerHTML = `
                <h3>${post.url ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer">` : ''}${post.title || post.text || "No Title"}${post.url ? '</a>' : ''} (${post.type || "Unknown Type"})</h3>
                <p>by ${post.by || "Unknown"} | ${new Date(post.time * 1000).toLocaleString() || "-"} | Score: ${post.score || 0} | Comments: ${post.descendants || 0}</p>
                <button onclick="toggleComments(${post.id}, this)">Show Comments</button>
                <div id="comments-${post.id}" style="display: none"></div>
            `
      feed.appendChild(postElement)
    }
  })
}

async function toggleComments(postId, button) {
  const commentsContainer = document.getElementById(`comments-${postId}`)
  if (commentsContainer.style.display === "none") {
    commentsContainer.style.display = "block"
    button.textContent = "Hide Comments"
    const comments = await loadComments(postId)
    displayComments(comments, commentsContainer)
  } else {
    commentsContainer.style.display = "none"
    button.textContent = "Show Comments"
  }
}

function displayComments(comments, container) {
  container.innerHTML = ""
  comments.forEach((comment) => {
    if (comment && !comment.deleted) {
      const commentElement = document.createElement("div")
      commentElement.classList.add("comment")
      commentElement.innerHTML = `
                <p><strong>${comment.by || "Unknown"}:</strong> ${comment.text || "No content"}</p>
            `
      container.appendChild(commentElement)
    }
  })
}

async function updateLiveData() {
  const liveDataContainer = document.getElementById("live-data")
  const latestItemId = await fetchItems("maxitem")
  const latestItem = await fetchItemDetails(latestItemId)

  liveDataContainer.innerHTML = `
        <h2 style="text-align:center">Latest Update   ${new Date().toLocaleTimeString()}</h2>
        <p>${latestItem.title || latestItem.text || "No content"}</p>
        <p>Type: ${latestItem.type}, by ${latestItem.by || "Unknown"}</p>
    `
}

loadPosts(selectedType)
updateLiveData()
document.getElementById("load-more").addEventListener("click", () => loadPosts(selectedType))
setInterval(updateLiveData, 5000)