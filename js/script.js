document.getElementById("newFile").addEventListener("click", function () {
	document.getElementById("systemContent").value = ""
	document.getElementById("messageSets").innerHTML = ""
})

document.getElementById("loadButton").addEventListener("click", function () {
	document.getElementById("loadFile").click()
})

document.getElementById("loadFile").addEventListener("change", function (event) {
	const file = event.target.files[0]
	const reader = new FileReader()
	reader.onload = function (e) {
		try {
			// 파일 내용을 정제하고 검증
			const content = e.target.result
			const cleanedContent = validateAndCleanContent(content)

			// 정제된 내용으로 데이터 로드
			loadData(cleanedContent)
		} catch (error) {
			alert(`Error loading file: ${error.message}`)
		}
	}
	reader.readAsText(file)
})

function validateAndCleanContent(content) {
	// 줄 단위로 분리하고 빈 줄 제거
	const lines = content.split("\n").filter((line) => line.trim() !== "")

	const cleanedLines = lines.map((line, index) => {
		try {
			// 줄 앞뒤의 공백 제거
			const trimmedLine = line.trim()
			// JSON 파싱 시도
			const obj = JSON.parse(trimmedLine)

			// 객체 구조 검증
			if (!Array.isArray(obj.messages) || obj.messages.length !== 3 || !obj.messages.every((msg) => "role" in msg && "content" in msg) || obj.messages[0].role !== "system" || obj.messages[1].role !== "user" || obj.messages[2].role !== "assistant") {
				throw new Error(`Invalid object structure at line ${index + 1}`)
			}

			// 정제된 JSON 문자열 반환
			return JSON.stringify(obj)
		} catch (error) {
			throw new Error(`Invalid JSON or structure at line ${index + 1}: ${error.message}`)
		}
	})

	// 정제된 JSONL 문자열 반환
	return cleanedLines.join("\n")
}

function loadData(jsonlContent) {
	// 기존 필드 초기화
	document.getElementById("systemContent").value = ""
	document.getElementById("messageSets").innerHTML = ""

	const lines = jsonlContent.split("\n")
	if (lines.length > 0) {
		try {
			const firstLine = JSON.parse(lines[0])
			document.getElementById("systemContent").value = firstLine.messages[0].content

			lines.forEach((line) => {
				const obj = JSON.parse(line)
				const userContent = obj.messages[1].content
				const assistantContent = obj.messages[2].content
				addMessageSet(userContent, assistantContent)
			})
		} catch (error) {
			console.error("Error parsing JSON:", error)
			alert(`Error loading data: ${error.message}`)
		}
	} else {
		alert("No valid data found in the file.")
	}
}

document.getElementById("saveFile").addEventListener("click", function () {
	const systemContent = document.getElementById("systemContent").value
	const messageSets = document.querySelectorAll(".message-set")

	if (!systemContent) {
		alert("System content cannot be empty.")
		return
	}

	if (messageSets.length < 10) {
		alert("You must have at least 10 message sets to save.")
		return
	}

	for (const set of messageSets) {
		const userContent = set.querySelector(".user-content").value
		const assistantContent = set.querySelector(".assistant-content").value

		if (!userContent || !assistantContent) {
			alert("User and assistant content cannot be empty.")
			return
		}
	}

	const jsonlContent = Array.from(messageSets)
		.map((set) => {
			const userContent = set.querySelector(".user-content").value
			const assistantContent = set.querySelector(".assistant-content").value
			return JSON.stringify({
				messages: [
					{ role: "system", content: systemContent },
					{ role: "user", content: userContent },
					{ role: "assistant", content: assistantContent },
				],
			})
		})
		.join("\n")

	const fileName = prompt("Enter a file name:", "data.jsonl")
	if (!fileName) return

	// Create a Blob with the content
	const blob = new Blob([jsonlContent], { type: "application/jsonl" })

	// Use the showSaveFilePicker API if supported
	if ("showSaveFilePicker" in window) {
		const opts = {
			types: [
				{
					description: "JSONL file",
					accept: { "application/jsonl": [".jsonl"] },
				},
			],
			suggestedName: fileName,
		}

		window
			.showSaveFilePicker(opts)
			.then((handle) => {
				return handle.createWritable()
			})
			.then((writable) => {
				return writable.write(blob).then(() => writable.close())
			})
			.catch((err) => {
				console.error("Failed to save file:", err)
				fallbackSave(blob, fileName)
			})
	} else {
		fallbackSave(blob, fileName)
	}
})

function fallbackSave(blob, fileName) {
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = fileName
	a.style.display = "none"
	document.body.appendChild(a)

	// Trigger a click event on the anchor
	if (document.createEvent) {
		const event = document.createEvent("MouseEvents")
		event.initEvent("click", true, true)
		a.dispatchEvent(event)
	} else {
		a.click()
	}

	// Clean up
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

document.getElementById("addSet").addEventListener("click", function () {
	addMessageSet()
})

function addMessageSet(userContent = "", assistantContent = "") {
	const messageSetDiv = document.createElement("div")
	messageSetDiv.className = "message-set"
	const setCount = document.querySelectorAll(".message-set").length + 1
	messageSetDiv.innerHTML = `
			<div class="input-group">
					<label for="user-content-${setCount}">User Content 
							<span class="tooltip" data-tooltip="this content should include example
							user questions, prompts, or instructions
							that guide the model’s response generation.">?</span>
					</label>
					<textarea id="user-content-${setCount}" class="user-content resizable" rows="2">${userContent}</textarea>
			</div>
			<div class="input-group">
					<label for="assistant-content-${setCount}">Assistant Content 
							<span class="tooltip" data-tooltip="This content should provide ideal responses
							from the model, demonstrating how it should
							reply to the user's input.">?</span>
					</label>		
					<textarea id="assistant-content-${setCount}" class="assistant-content resizable" rows="2">${assistantContent}</textarea>
			</div>
			<button class="removeSet">Remove Set</button>
	`
	document.getElementById("messageSets").appendChild(messageSetDiv)

	messageSetDiv.querySelector(".removeSet").addEventListener("click", function () {
		messageSetDiv.remove()
	})
}

function toggleVisibility(currentId, otherId) {
	var currentElement = document.getElementById(currentId)
	var otherElement = document.getElementById(otherId)

	// Close the other section if it's open
	if (otherElement.style.display === "block") {
		otherElement.style.display = "none"
	}

	// Toggle the current section
	if (currentElement.style.display === "none") {
		currentElement.style.display = "block"
	} else {
		currentElement.style.display = "none"
	}
}
