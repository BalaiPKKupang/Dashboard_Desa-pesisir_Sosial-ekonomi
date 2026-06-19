class SidebarNav {
  constructor(stateManager) {
    this.sm = stateManager;
    
    // Bind DOM buttons
    this.buttons = document.querySelectorAll(".nav-btn");
    
    this.initEvents();
    
    // Subscribe to state tab changes
    this.sm.subscribe("tabChanged", (tabName) => this.onTabChanged(tabName));
  }

  initEvents() {
    this.buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");
        if (tabName) {
          this.sm.setActiveTab(tabName);
        }
      });
    });
  }

  onTabChanged(activeTab) {
    // Add active class to selected tab, remove from others
    this.buttons.forEach(btn => {
      const tabName = btn.getAttribute("data-tab");
      if (tabName === activeTab) {
        btn.classList.add("active");
        
        // Scroll to the active button if in horizontal scroll mode on mobile
        btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      } else {
        btn.classList.remove("active");
      }
    });

    // Automatically scroll to the detail section when tab changes
    const detailSec = document.getElementById("detail-section");
    if (detailSec) {
      detailSec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}
