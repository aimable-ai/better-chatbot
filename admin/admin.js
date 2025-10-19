// Better Chatbot Admin Panel JavaScript
class AdminPanel {
  constructor() {
    this.baseUrl = "http://localhost:3001/api"; // Adjust this to your Next.js app URL
    this.init();
  }

  init() {
    this.checkAuth();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add any global event listeners here
  }

  async checkAuth() {
    try {
      const response = await this.makeRequest("/user/details", "GET");
      if (response.ok) {
        const userData = await response.json();
        this.updateAuthStatus(
          "authenticated",
          `Authenticated as: ${userData.name || userData.email || "User"}`,
        );
      } else {
        this.updateAuthStatus(
          "error",
          "Not authenticated. Please log in to the main application first.",
        );
      }
    } catch (error) {
      this.updateAuthStatus(
        "error",
        `Authentication check failed: ${error.message}`,
      );
    }
  }

  updateAuthStatus(status, message) {
    const authStatus = document.getElementById("authStatus");
    authStatus.className = `auth-status ${status}`;

    let logoutButton = "";
    if (status === "authenticated") {
      logoutButton = `
                <div style="margin-top: 1rem;">
                    <button class="btn btn-danger" onclick="logout()">Logout</button>
                </div>
            `;
    }

    authStatus.innerHTML = `
            <h3>Authentication Status</h3>
            <p>${message}</p>
            ${logoutButton}
        `;
  }

  async makeRequest(
    endpoint,
    method = "GET",
    data = null,
    params = null,
    customHeaders = null,
  ) {
    let url = `${this.baseUrl}${endpoint}`;

    // Add query parameters
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...customHeaders,
      },
      credentials: "include", // This ensures cookies are sent
    };

    if (data && method !== "GET") {
      options.body = JSON.stringify(data);
    }

    return fetch(url, options);
  }

  async handleResponse(response, responseElementId, contentElementId) {
    const responseElement = document.getElementById(responseElementId);
    const contentElement = document.getElementById(contentElementId);

    responseElement.style.display = "block";

    try {
      const data = await response.json();
      const statusClass = response.ok ? "status-success" : "status-error";
      contentElement.innerHTML = `<span class="${statusClass}">Status: ${response.status} ${response.statusText}</span>\n\n${JSON.stringify(data, null, 2)}`;
    } catch (error) {
      const text = await response.text();
      contentElement.innerHTML = `<span class="status-error">Status: ${response.status} ${response.statusText}</span>\n\nError parsing JSON: ${error.message}\n\nRaw response: ${text}`;
    }
  }

  // Quick Actions
  async testAuth() {
    await this.checkAuth();
  }

  async getAllUsers() {
    try {
      const response = await this.makeRequest("/admin/users?page=1&limit=50");
      await this.handleResponse(
        response,
        "userResponse",
        "userResponseContent",
      );
    } catch (error) {
      console.error("Error getting users:", error);
    }
  }

  async getAllAgents() {
    try {
      const response = await this.makeRequest("/agent");
      await this.handleResponse(
        response,
        "agentResponse",
        "agentResponseContent",
      );
    } catch (error) {
      console.error("Error getting agents:", error);
    }
  }

  async getAllWorkflows() {
    try {
      const response = await this.makeRequest("/workflow");
      await this.handleResponse(
        response,
        "workflowResponse",
        "workflowResponseContent",
      );
    } catch (error) {
      console.error("Error getting workflows:", error);
    }
  }

  async testSpaceAPI() {
    try {
      console.log("Testing Space API...");

      // Test 1: Get spaces
      console.log("1. Testing GET /spaces");
      const spacesResponse = await this.makeRequest("/spaces");
      console.log("Spaces response:", spacesResponse);

      if (spacesResponse.ok) {
        const spacesData = await spacesResponse.json();
        console.log("Spaces data:", spacesData);

        if (spacesData.spaces && spacesData.spaces.length > 0) {
          const firstSpace = spacesData.spaces[0];
          console.log("Testing with first space:", firstSpace.id);

          // Test 2: Get space details
          console.log("2. Testing GET /spaces/{id}");
          const spaceResponse = await this.makeRequest(
            `/spaces/${firstSpace.id}`,
          );
          console.log(
            "Space response status:",
            spaceResponse.status,
            spaceResponse.statusText,
          );

          // Test 3: Get members
          console.log("3. Testing GET /spaces/{id}/members");
          const membersResponse = await this.makeRequest(
            `/spaces/${firstSpace.id}/members`,
          );
          console.log(
            "Members response status:",
            membersResponse.status,
            membersResponse.statusText,
          );

          // Test 4: Get invites
          console.log("4. Testing GET /spaces/{id}/invites");
          const invitesResponse = await this.makeRequest(
            `/spaces/${firstSpace.id}/invites`,
          );
          console.log(
            "Invites response status:",
            invitesResponse.status,
            invitesResponse.statusText,
          );
        } else {
          console.log("No spaces found, creating a test space...");

          // Test 5: Create space
          console.log("5. Testing POST /spaces");
          const createResponse = await this.makeRequest("/spaces", "POST", {
            name: "Test Space from Admin",
          });
          console.log(
            "Create response status:",
            createResponse.status,
            createResponse.statusText,
          );
        }
      } else {
        console.error(
          "Failed to get spaces:",
          spacesResponse.status,
          spacesResponse.statusText,
        );
        const errorText = await spacesResponse.text();
        console.error("Error details:", errorText);
      }

      alert(
        "Space API test completed! Check the browser console for detailed results.",
      );
    } catch (error) {
      console.error("Error testing Space API:", error);
      alert(`Error testing Space API: ${error.message}`);
    }
  }

  // User Management
  async getUserDetails() {
    const userId = document.getElementById("userId").value;
    if (!userId) {
      alert("Please enter a user ID");
      return;
    }

    try {
      const response = await this.makeRequest(`/user/details/${userId}`);
      await this.handleResponse(
        response,
        "userResponse",
        "userResponseContent",
      );
    } catch (error) {
      console.error("Error getting user details:", error);
    }
  }

  async createUser() {
    const email = document.getElementById("createUserEmail").value;
    const name = document.getElementById("createUserName").value;
    const password = document.getElementById("createUserPassword").value;
    const role = document.getElementById("createUserRole").value;

    // Validate required fields
    if (!email || !name || !password) {
      alert("Please fill in all required fields (Email, Name, Password)");
      return;
    }

    // Validate password length
    if (password.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      const userData = {
        email: email,
        name: name,
        password: password,
        role: role,
      };

      const response = await this.makeRequest("/admin/users", "POST", userData);
      await this.handleResponse(
        response,
        "userResponse",
        "userResponseContent",
      );

      // Clear form on success
      if (response.ok) {
        document.getElementById("createUserEmail").value = "";
        document.getElementById("createUserName").value = "";
        document.getElementById("createUserPassword").value = "";
        document.getElementById("createUserRole").value = "user";
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user. Please try again.");
    }
  }

  async updateUser() {
    const userId = document.getElementById("userId").value;
    const userDataText = document.getElementById("userData").value;

    if (!userId || !userDataText) {
      alert("Please enter both user ID and user data");
      return;
    }

    try {
      const userData = JSON.parse(userDataText);
      const response = await this.makeRequest(
        `/admin/users/${userId}`,
        "PATCH",
        userData,
      );
      await this.handleResponse(
        response,
        "userResponse",
        "userResponseContent",
      );
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Invalid JSON data");
    }
  }

  async deleteUser() {
    const userId = document.getElementById("userId").value;
    if (!userId) {
      alert("Please enter a user ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const response = await this.makeRequest(
        `/admin/users/${userId}`,
        "DELETE",
      );
      await this.handleResponse(
        response,
        "userResponse",
        "userResponseContent",
      );
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }

  // Agent Management
  async getAgents() {
    const query = document.getElementById("agentQuery").value;
    const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};

    try {
      const response = await this.makeRequest("/agent", "GET", null, params);
      await this.handleResponse(
        response,
        "agentResponse",
        "agentResponseContent",
      );
    } catch (error) {
      console.error("Error getting agents:", error);
    }
  }

  async getAgentById() {
    const agentId = document.getElementById("agentId").value;
    if (!agentId) {
      alert("Please enter an agent ID");
      return;
    }

    try {
      const response = await this.makeRequest(`/agent/${agentId}`);
      await this.handleResponse(
        response,
        "agentResponse",
        "agentResponseContent",
      );
    } catch (error) {
      console.error("Error getting agent:", error);
    }
  }

  async createAgent() {
    const agentDataText = document.getElementById("agentData").value;
    if (!agentDataText) {
      alert("Please enter agent data");
      return;
    }

    try {
      const agentData = JSON.parse(agentDataText);
      const response = await this.makeRequest("/agent", "POST", agentData);
      await this.handleResponse(
        response,
        "agentResponse",
        "agentResponseContent",
      );
    } catch (error) {
      console.error("Error creating agent:", error);
      alert("Invalid JSON data");
    }
  }

  async updateAgent() {
    const agentId = document.getElementById("agentId").value;
    const agentDataText = document.getElementById("agentData").value;

    if (!agentId || !agentDataText) {
      alert("Please enter both agent ID and agent data");
      return;
    }

    try {
      const agentData = JSON.parse(agentDataText);
      const response = await this.makeRequest(
        `/agent/${agentId}`,
        "PATCH",
        agentData,
      );
      await this.handleResponse(
        response,
        "agentResponse",
        "agentResponseContent",
      );
    } catch (error) {
      console.error("Error updating agent:", error);
      alert("Invalid JSON data");
    }
  }

  async deleteAgent() {
    const agentId = document.getElementById("agentId").value;
    if (!agentId) {
      alert("Please enter an agent ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this agent?")) {
      return;
    }

    try {
      const response = await this.makeRequest(`/agent/${agentId}`, "DELETE");
      await this.handleResponse(
        response,
        "agentResponse",
        "agentResponseContent",
      );
    } catch (error) {
      console.error("Error deleting agent:", error);
    }
  }

  // Workflow Management
  async getWorkflows() {
    try {
      const response = await this.makeRequest("/workflow");
      await this.handleResponse(
        response,
        "workflowResponse",
        "workflowResponseContent",
      );
    } catch (error) {
      console.error("Error getting workflows:", error);
    }
  }

  async getWorkflowById() {
    const workflowId = document.getElementById("workflowId").value;
    if (!workflowId) {
      alert("Please enter a workflow ID");
      return;
    }

    try {
      const response = await this.makeRequest(`/workflow/${workflowId}`);
      await this.handleResponse(
        response,
        "workflowResponse",
        "workflowResponseContent",
      );
    } catch (error) {
      console.error("Error getting workflow:", error);
    }
  }

  async createWorkflow() {
    const workflowDataText = document.getElementById("workflowData").value;
    if (!workflowDataText) {
      alert("Please enter workflow data");
      return;
    }

    try {
      const workflowData = JSON.parse(workflowDataText);
      const response = await this.makeRequest(
        "/workflow",
        "POST",
        workflowData,
      );
      await this.handleResponse(
        response,
        "workflowResponse",
        "workflowResponseContent",
      );
    } catch (error) {
      console.error("Error creating workflow:", error);
      alert("Invalid JSON data");
    }
  }

  async updateWorkflow() {
    const workflowId = document.getElementById("workflowId").value;
    const workflowDataText = document.getElementById("workflowData").value;

    if (!workflowId || !workflowDataText) {
      alert("Please enter both workflow ID and workflow data");
      return;
    }

    try {
      const workflowData = JSON.parse(workflowDataText);
      const response = await this.makeRequest(
        `/workflow/${workflowId}`,
        "PATCH",
        workflowData,
      );
      await this.handleResponse(
        response,
        "workflowResponse",
        "workflowResponseContent",
      );
    } catch (error) {
      console.error("Error updating workflow:", error);
      alert("Invalid JSON data");
    }
  }

  async deleteWorkflow() {
    const workflowId = document.getElementById("workflowId").value;
    if (!workflowId) {
      alert("Please enter a workflow ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this workflow?")) {
      return;
    }

    try {
      const response = await this.makeRequest(
        `/workflow/${workflowId}`,
        "DELETE",
      );
      await this.handleResponse(
        response,
        "workflowResponse",
        "workflowResponseContent",
      );
    } catch (error) {
      console.error("Error deleting workflow:", error);
    }
  }

  // MCP Management
  async getMcpList() {
    try {
      const response = await this.makeRequest("/mcp/list");
      await this.handleResponse(response, "mcpResponse", "mcpResponseContent");
    } catch (error) {
      console.error("Error getting MCP list:", error);
    }
  }

  async getMcpById() {
    const mcpId = document.getElementById("mcpId").value;
    if (!mcpId) {
      alert("Please enter an MCP ID");
      return;
    }

    try {
      const response = await this.makeRequest(`/mcp/${mcpId}`);
      await this.handleResponse(response, "mcpResponse", "mcpResponseContent");
    } catch (error) {
      console.error("Error getting MCP:", error);
    }
  }

  async createMcp() {
    const mcpDataText = document.getElementById("mcpData").value;
    if (!mcpDataText) {
      alert("Please enter MCP data");
      return;
    }

    try {
      const mcpData = JSON.parse(mcpDataText);
      const response = await this.makeRequest("/mcp", "POST", mcpData);
      await this.handleResponse(response, "mcpResponse", "mcpResponseContent");
    } catch (error) {
      console.error("Error creating MCP:", error);
      alert("Invalid JSON data");
    }
  }

  async updateMcp() {
    const mcpId = document.getElementById("mcpId").value;
    const mcpDataText = document.getElementById("mcpData").value;

    if (!mcpId || !mcpDataText) {
      alert("Please enter both MCP ID and MCP data");
      return;
    }

    try {
      const mcpData = JSON.parse(mcpDataText);
      const response = await this.makeRequest(
        `/mcp/${mcpId}`,
        "PATCH",
        mcpData,
      );
      await this.handleResponse(response, "mcpResponse", "mcpResponseContent");
    } catch (error) {
      console.error("Error updating MCP:", error);
      alert("Invalid JSON data");
    }
  }

  async deleteMcp() {
    const mcpId = document.getElementById("mcpId").value;
    if (!mcpId) {
      alert("Please enter an MCP ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this MCP?")) {
      return;
    }

    try {
      const response = await this.makeRequest(`/mcp/${mcpId}`, "DELETE");
      await this.handleResponse(response, "mcpResponse", "mcpResponseContent");
    } catch (error) {
      console.error("Error deleting MCP:", error);
    }
  }

  // Spaces Management
  async getSpaces() {
    try {
      const response = await this.makeRequest("/spaces");
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error getting spaces:", error);
    }
  }

  async getSpaceById() {
    const spaceId = document.getElementById("spaceId").value;
    if (!spaceId) {
      alert("Please enter a space ID");
      return;
    }

    try {
      const response = await this.makeRequest(`/spaces/${spaceId}`);
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error getting space:", error);
    }
  }

  async createSpace() {
    const spaceDataText = document.getElementById("spaceData").value;
    if (!spaceDataText) {
      alert("Please enter space data");
      return;
    }

    try {
      const spaceData = JSON.parse(spaceDataText);
      const response = await this.makeRequest("/spaces", "POST", spaceData);
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error creating space:", error);
      alert("Invalid JSON data");
    }
  }

  async updateSpace() {
    const spaceId = document.getElementById("spaceId").value;
    const spaceDataText = document.getElementById("spaceData").value;

    if (!spaceId || !spaceDataText) {
      alert("Please enter both space ID and space data");
      return;
    }

    try {
      const spaceData = JSON.parse(spaceDataText);
      const response = await this.makeRequest(
        `/spaces/${spaceId}`,
        "PATCH",
        spaceData,
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error updating space:", error);
      alert("Invalid JSON data");
    }
  }

  // Spaces Management - Lifecycle
  async archiveSpace() {
    const spaceId = document.getElementById("spaceId").value;
    if (!spaceId) {
      alert("Please enter a space ID");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to archive this space? This will make it read-only.",
      )
    ) {
      return;
    }

    try {
      console.log(`Archiving space: ${spaceId}`);
      const response = await this.makeRequest(
        `/spaces/${spaceId}/archive`,
        "POST",
      );
      console.log(
        "Archive response status:",
        response.status,
        response.statusText,
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error archiving space:", error);
      alert(`Error archiving space: ${error.message}`);
    }
  }

  async unarchiveSpace() {
    const spaceId = document.getElementById("spaceId").value;
    if (!spaceId) {
      alert("Please enter a space ID");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to restore this space? This will make it active again.",
      )
    ) {
      return;
    }

    try {
      console.log(`Unarchiving space: ${spaceId}`);
      const response = await this.makeRequest(
        `/spaces/${spaceId}/unarchive`,
        "POST",
      );
      console.log(
        "Unarchive response status:",
        response.status,
        response.statusText,
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error unarchiving space:", error);
      alert(`Error unarchiving space: ${error.message}`);
    }
  }

  async getSpaceMembers() {
    const spaceId = document.getElementById("spaceId").value;
    if (!spaceId) {
      alert("Please enter a space ID");
      return;
    }

    try {
      console.log(`Getting members for space: ${spaceId}`);
      const response = await this.makeRequest(`/spaces/${spaceId}/members`);
      console.log(
        "Members response status:",
        response.status,
        response.statusText,
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error getting space members:", error);
      alert(`Error getting space members: ${error.message}`);
    }
  }

  async getSpaceInvites() {
    const spaceId = document.getElementById("spaceId").value;
    if (!spaceId) {
      alert("Please enter a space ID");
      return;
    }

    try {
      console.log(`Getting invites for space: ${spaceId}`);
      const response = await this.makeRequest(`/spaces/${spaceId}/invites`);
      console.log(
        "Invites response status:",
        response.status,
        response.statusText,
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error getting space invites:", error);
      alert(`Error getting space invites: ${error.message}`);
    }
  }

  async addSpaceMember() {
    const spaceId = document.getElementById("spaceId").value;
    const userId = document.getElementById("memberUserId").value;
    const role = document.getElementById("memberRole").value;

    if (!spaceId || !userId) {
      alert("Please enter both space ID and user ID");
      return;
    }

    try {
      const memberData = { userId, role };
      const response = await this.makeRequest(
        `/spaces/${spaceId}/members`,
        "POST",
        memberData,
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error adding space member:", error);
    }
  }

  async updateSpaceMember() {
    const spaceId = document.getElementById("spaceId").value;
    const userId = document.getElementById("memberUserId").value;
    const role = document.getElementById("memberRole").value;

    if (!spaceId || !userId) {
      alert("Please enter both space ID and user ID");
      return;
    }

    try {
      const memberData = { role };
      const response = await this.makeRequest(
        `/spaces/${spaceId}/members/${userId}`,
        "PATCH",
        memberData,
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error updating space member:", error);
    }
  }

  async removeSpaceMember() {
    const spaceId = document.getElementById("spaceId").value;
    const userId = document.getElementById("memberUserId").value;

    if (!spaceId || !userId) {
      alert("Please enter both space ID and user ID");
      return;
    }

    if (
      !confirm("Are you sure you want to remove this member from the space?")
    ) {
      return;
    }

    try {
      const response = await this.makeRequest(
        `/spaces/${spaceId}/members/${userId}`,
        "DELETE",
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error removing space member:", error);
    }
  }

  async createSpaceInvite() {
    const spaceId = document.getElementById("spaceId").value;
    const email = document.getElementById("inviteEmail").value;
    const role = document.getElementById("inviteRole").value;

    if (!spaceId || !email) {
      alert("Please enter both space ID and email");
      return;
    }

    try {
      const inviteData = { email, role };
      const response = await this.makeRequest(
        `/spaces/${spaceId}/invites`,
        "POST",
        inviteData,
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error creating space invite:", error);
    }
  }

  async deleteSpaceInvite() {
    const spaceId = document.getElementById("spaceId").value;
    const email = document.getElementById("inviteEmail").value;

    if (!spaceId || !email) {
      alert("Please enter both space ID and email");
      return;
    }

    if (!confirm("Are you sure you want to delete this invite?")) {
      return;
    }

    try {
      // Note: This would need a specific invite ID endpoint, for now we'll use a generic approach
      const response = await this.makeRequest(
        `/spaces/${spaceId}/invites`,
        "DELETE",
        { email },
      );
      await this.handleResponse(
        response,
        "spaceResponse",
        "spaceResponseContent",
      );
    } catch (error) {
      console.error("Error deleting space invite:", error);
    }
  }

  // Cleanup Jobs
  async runSpaceCleanup() {
    const cronSecret = document.getElementById("cronSecret").value;
    if (!cronSecret) {
      alert("Please enter the cron secret");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to run the space cleanup job? This will permanently delete archived spaces older than the retention period.",
      )
    ) {
      return;
    }

    try {
      const response = await this.makeRequest(
        "/cron/cleanup-spaces",
        "POST",
        {},
        null,
        {
          Authorization: `Bearer ${cronSecret}`,
        },
      );
      await this.handleResponse(
        response,
        "cleanupResponse",
        "cleanupResponseContent",
      );
    } catch (error) {
      console.error("Error running cleanup job:", error);
    }
  }

  // Chat Management
  async getChatModels() {
    try {
      const response = await this.makeRequest("/chat/models");
      await this.handleResponse(
        response,
        "chatResponse",
        "chatResponseContent",
      );
    } catch (error) {
      console.error("Error getting chat models:", error);
    }
  }

  async sendChat() {
    const chatDataText = document.getElementById("chatData").value;
    if (!chatDataText) {
      alert("Please enter chat data");
      return;
    }

    try {
      const chatData = JSON.parse(chatDataText);
      const response = await this.makeRequest("/chat", "POST", chatData);
      await this.handleResponse(
        response,
        "chatResponse",
        "chatResponseContent",
      );
    } catch (error) {
      console.error("Error sending chat:", error);
      alert("Invalid JSON data");
    }
  }

  async getChatTitle() {
    try {
      const response = await this.makeRequest("/chat/title", "GET");
      await this.handleResponse(
        response,
        "chatResponse",
        "chatResponseContent",
      );
    } catch (error) {
      console.error("Error getting chat title:", error);
    }
  }

  // Archive Management
  async getArchives() {
    try {
      const response = await this.makeRequest("/archive");
      await this.handleResponse(
        response,
        "archiveResponse",
        "archiveResponseContent",
      );
    } catch (error) {
      console.error("Error getting archives:", error);
    }
  }

  async getArchiveById() {
    const archiveId = document.getElementById("archiveId").value;
    if (!archiveId) {
      alert("Please enter an archive ID");
      return;
    }

    try {
      const response = await this.makeRequest(`/archive/${archiveId}`);
      await this.handleResponse(
        response,
        "archiveResponse",
        "archiveResponseContent",
      );
    } catch (error) {
      console.error("Error getting archive:", error);
    }
  }

  async getArchiveItems() {
    const archiveId = document.getElementById("archiveId").value;
    if (!archiveId) {
      alert("Please enter an archive ID");
      return;
    }

    try {
      const response = await this.makeRequest(`/archive/${archiveId}/items`);
      await this.handleResponse(
        response,
        "archiveResponse",
        "archiveResponseContent",
      );
    } catch (error) {
      console.error("Error getting archive items:", error);
    }
  }

  async getArchiveItem() {
    const archiveId = document.getElementById("archiveId").value;
    const itemId = document.getElementById("itemId").value;

    if (!archiveId || !itemId) {
      alert("Please enter both archive ID and item ID");
      return;
    }

    try {
      const response = await this.makeRequest(
        `/archive/${archiveId}/items/${itemId}`,
      );
      await this.handleResponse(
        response,
        "archiveResponse",
        "archiveResponseContent",
      );
    } catch (error) {
      console.error("Error getting archive item:", error);
    }
  }

  // Thread Management
  async getThreads() {
    try {
      const response = await this.makeRequest("/thread");
      await this.handleResponse(
        response,
        "threadResponse",
        "threadResponseContent",
      );
    } catch (error) {
      console.error("Error getting threads:", error);
    }
  }

  // Bookmark Management
  async createBookmark() {
    const bookmarkDataText = document.getElementById("bookmarkData").value;
    if (!bookmarkDataText) {
      alert("Please enter bookmark data");
      return;
    }

    try {
      const bookmarkData = JSON.parse(bookmarkDataText);
      const response = await this.makeRequest(
        "/bookmark",
        "POST",
        bookmarkData,
      );
      await this.handleResponse(
        response,
        "bookmarkResponse",
        "bookmarkResponseContent",
      );
    } catch (error) {
      console.error("Error creating bookmark:", error);
      alert("Invalid JSON data");
    }
  }

  async deleteBookmark() {
    const bookmarkDataText = document.getElementById("bookmarkData").value;
    if (!bookmarkDataText) {
      alert("Please enter bookmark data");
      return;
    }

    try {
      const bookmarkData = JSON.parse(bookmarkDataText);
      const response = await this.makeRequest(
        "/bookmark",
        "DELETE",
        bookmarkData,
      );
      await this.handleResponse(
        response,
        "bookmarkResponse",
        "bookmarkResponseContent",
      );
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      alert("Invalid JSON data");
    }
  }

  // Login Modal Functions
  openLoginModal() {
    const modal = document.getElementById("loginModal");
    modal.style.display = "block";
    // Clear previous messages
    document.getElementById("loginMessage").innerHTML = "";
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
  }

  closeLoginModal() {
    const modal = document.getElementById("loginModal");
    modal.style.display = "none";
  }

  async handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const loginButton = document.getElementById("loginButton");
    const messageDiv = document.getElementById("loginMessage");

    // Disable button and show loading state
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    messageDiv.innerHTML = "";

    try {
      // Attempt to login using the auth endpoint
      const loginData = {
        email: email,
        password: password,
      };

      console.log("Attempting login with:", email);
      const response = await this.makeRequest(
        "/auth/sign-in",
        "POST",
        loginData,
      );
      console.log("Login response:", response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        messageDiv.innerHTML =
          '<div class="login-success">Login successful! Refreshing authentication...</div>';

        // Close modal after a short delay
        setTimeout(() => {
          this.closeLoginModal();
          // Refresh authentication status
          this.checkAuth();
        }, 1500);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Login failed" }));
        messageDiv.innerHTML = `<div class="login-error">Login failed: ${errorData.message || "Invalid credentials"}</div>`;
      }
    } catch (error) {
      console.error("Login error:", error);
      messageDiv.innerHTML = `<div class="login-error">Login error: ${error.message}</div>`;
    } finally {
      // Re-enable button
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  }

  async logout() {
    try {
      console.log("Attempting logout...");
      // Attempt to logout using the correct Better Auth endpoint
      const response = await this.makeRequest("/auth/sign-out", "POST");

      console.log("Logout response:", response.status, response.statusText);

      if (response.ok) {
        // Update auth status to show logged out
        this.updateAuthStatus(
          "error",
          "Successfully logged out. Please log in to continue.",
        );

        // Optional: Clear any stored data or redirect
        console.log("Logout successful");
      } else {
        console.error("Logout failed:", response.status, response.statusText);
        // Even if logout fails on server, clear local state
        this.updateAuthStatus(
          "error",
          "Logged out locally. Please refresh the page.",
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear local state
      this.updateAuthStatus(
        "error",
        "Logged out locally. Please refresh the page.",
      );
    }
  }
}

// Global functions for HTML onclick handlers
function toggleSection(sectionId) {
  const content = document.getElementById(sectionId);
  const toggle = document.getElementById(`toggle-${sectionId}`);

  if (content.classList.contains("active")) {
    content.classList.remove("active");
    toggle.classList.remove("expanded");
  } else {
    content.classList.add("active");
    toggle.classList.add("expanded");
  }
}
// Initialize admin panel
const adminPanel = new AdminPanel();

// Global functions for button clicks
function testAuth() {
  adminPanel.testAuth();
}
function getAllUsers() {
  adminPanel.getAllUsers();
}
function getAllAgents() {
  adminPanel.getAllAgents();
}
function getAllWorkflows() {
  adminPanel.getAllWorkflows();
}
function testSpaceAPI() {
  adminPanel.testSpaceAPI();
}

// User functions
function getUserDetails() {
  adminPanel.getUserDetails();
}
function createUser() {
  adminPanel.createUser();
}
function updateUser() {
  adminPanel.updateUser();
}
function deleteUser() {
  adminPanel.deleteUser();
}

// Agent functions
function getAgents() {
  adminPanel.getAgents();
}
function getAgentById() {
  adminPanel.getAgentById();
}
function createAgent() {
  adminPanel.createAgent();
}
function updateAgent() {
  adminPanel.updateAgent();
}
function deleteAgent() {
  adminPanel.deleteAgent();
}

// Workflow functions
function getWorkflows() {
  adminPanel.getWorkflows();
}
function getWorkflowById() {
  adminPanel.getWorkflowById();
}
function createWorkflow() {
  adminPanel.createWorkflow();
}
function updateWorkflow() {
  adminPanel.updateWorkflow();
}
function deleteWorkflow() {
  adminPanel.deleteWorkflow();
}

// MCP functions
function getMcpList() {
  adminPanel.getMcpList();
}
function getMcpById() {
  adminPanel.getMcpById();
}
function createMcp() {
  adminPanel.createMcp();
}
function updateMcp() {
  adminPanel.updateMcp();
}
function deleteMcp() {
  adminPanel.deleteMcp();
}

// Space functions
function getSpaces() {
  adminPanel.getSpaces();
}
function getSpaceById() {
  adminPanel.getSpaceById();
}
function createSpace() {
  adminPanel.createSpace();
}
function updateSpace() {
  adminPanel.updateSpace();
}
function deleteSpace() {
  adminPanel.deleteSpace();
}

// Space lifecycle functions
function archiveSpace() {
  adminPanel.archiveSpace();
}
function unarchiveSpace() {
  adminPanel.unarchiveSpace();
}
function getSpaceMembers() {
  adminPanel.getSpaceMembers();
}
function getSpaceInvites() {
  adminPanel.getSpaceInvites();
}
function addSpaceMember() {
  adminPanel.addSpaceMember();
}
function updateSpaceMember() {
  adminPanel.updateSpaceMember();
}
function removeSpaceMember() {
  adminPanel.removeSpaceMember();
}
function createSpaceInvite() {
  adminPanel.createSpaceInvite();
}
function deleteSpaceInvite() {
  adminPanel.deleteSpaceInvite();
}

// Cleanup functions
function runSpaceCleanup() {
  adminPanel.runSpaceCleanup();
}

// Chat functions
function getChatModels() {
  adminPanel.getChatModels();
}
function sendChat() {
  adminPanel.sendChat();
}
function getChatTitle() {
  adminPanel.getChatTitle();
}

// Archive functions
function getArchives() {
  adminPanel.getArchives();
}
function getArchiveById() {
  adminPanel.getArchiveById();
}
function getArchiveItems() {
  adminPanel.getArchiveItems();
}
function getArchiveItem() {
  adminPanel.getArchiveItem();
}

// Thread functions
function getThreads() {
  adminPanel.getThreads();
}

// Bookmark functions
function createBookmark() {
  adminPanel.createBookmark();
}
function deleteBookmark() {
  adminPanel.deleteBookmark();
}

// Login modal functions
function openLoginModal() {
  adminPanel.openLoginModal();
}
function closeLoginModal() {
  adminPanel.closeLoginModal();
}
function handleLogin(event) {
  adminPanel.handleLogin(event);
}

// Logout function
function logout() {
  adminPanel.logout();
}

// Close modal when clicking outside of it
window.onclick = function (event) {
  const modal = document.getElementById("loginModal");
  if (event.target === modal) {
    adminPanel.closeLoginModal();
  }
};

// Close modal with Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const modal = document.getElementById("loginModal");
    if (modal.style.display === "block") {
      adminPanel.closeLoginModal();
    }
  }
});
