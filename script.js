/*============== DOCUTRACK Personal Document Expiry Dashboard============== */
"use strict";

/*============== STORAGE============== */
const STORAGE={
    users:"docutrack_users",
    session:"docutrack_session",
    theme:"docutrack_theme"
};

/*============== GLOBAL VARIABLES============== */
let currentCalendarDate=new Date();
let documentModal=null;
let viewDocumentModal=null;
let appToast=null;
let confirmModal=null;
let confirmActionCallback=null;

/*============== DOM READY============== */
document.addEventListener("DOMContentLoaded",()=>{
    initializeBootstrap();
    initializeTheme();
    initializeAuth();
    initializeNavigation();
    initializeSidebar();
    initializePasswordToggles();
    initializeThemeButtons();
    initializeDocumentEvents();
    initializeCalendar();
    initializeProfile();
    initializeQuickActions();
    startClock();
    checkSession();
});

/*============== BOOTSTRAP============== */
function initializeBootstrap(){
    const documentModalElement=document.getElementById("documentModal");
    const viewModalElement=document.getElementById("viewDocumentModal");
    const toastElement=document.getElementById("appToast");
    const confirmModalElement=document.getElementById("confirmModal");
    if(documentModalElement){
        documentModal=new bootstrap.Modal(documentModalElement);
    }
    if(viewModalElement){
        viewDocumentModal=new bootstrap.Modal(viewModalElement);
    }
    if(toastElement){
        appToast=new bootstrap.Toast(toastElement,{ delay:3500 });
    }
    if(confirmModalElement){
        confirmModal=new bootstrap.Modal(confirmModalElement);
        document.getElementById("confirmOkBtn").addEventListener("click",()=>{
            if(confirmActionCallback){
                confirmActionCallback();
            }
            confirmModal.hide();
        });
    }
}

/*============== CUSTOM CONFIRM HELPER============== */
function showConfirm(message,callback){
    const msgElement=document.getElementById("confirmMessage");
    if(msgElement && confirmModal){
        msgElement.textContent=message;
        confirmActionCallback=callback;
        confirmModal.show();
    }
}

/*============== LOCAL STORAGE HELPERS============== */
function getUsers(){
    try{
        return JSON.parse(localStorage.getItem(STORAGE.users))||[];
    } catch(error){
        return [];
    }
}

function saveUsers(users){
    localStorage.setItem(STORAGE.users,JSON.stringify(users));
}

function getCurrentUser(){
    const session=localStorage.getItem(STORAGE.session);
    if(!session){
        return null;
    }
    const users=getUsers();
    return users.find(user=>user.id===session)||null;
}

function getDocuments(){
    const user=getCurrentUser();
    if(!user){
        return [];
    }
    try{
        return JSON.parse(localStorage.getItem(`docutrack_documents_${user.id}`))||[];
    } catch(error){
        return [];
    }
}

function saveDocuments(documents){
    const user=getCurrentUser();
    if(!user){
        return;
    }
    localStorage.setItem(`docutrack_documents_${user.id}`,JSON.stringify(documents));
}

/*============== ID============== */
function generateId(){
    return(Date.now().toString(36) + Math.random().toString(36).substring(2,8));
}

/*============== DATE HELPERS============== */
function getTodayString(){
    const now=new Date();
    const year=now.getFullYear();
    const month=String(now.getMonth() + 1).padStart(2,"0");
    const day=String(now.getDate()).padStart(2,"0");
    return `${year}-${month}-${day}`;
}

function parseLocalDate(isoDate){
    if(!isoDate){
        return null;
    }
    const parts=isoDate.split("-").map(Number);
    if(parts.length!==3){
        return null;
    }
    return new Date(parts[0],parts[1] - 1,parts[2]);
}

function formatDate(isoDate){
    const date=parseLocalDate(isoDate);
    if(!date){
        return "-";
    }
    return date.toLocaleDateString("en-IN",{ day:"2-digit",month:"short",year:"numeric" });
}

/*============== LIVE CLOCK============== */
function startClock(){
    const dateElement=document.getElementById("currentDate");
    if(!dateElement) return;
    function update(){
        const now=new Date();
        const dateStr=now.toLocaleDateString("en-IN",{ weekday:"long",day:"numeric",month:"long",year:"numeric" });
        const timeStr=now.toLocaleTimeString("en-IN",{ hour:'2-digit',minute:'2-digit',second:'2-digit' });
        dateElement.textContent=`${dateStr} ${timeStr}`;
    }
    update();
    setInterval(update,1000);
}

/*============== DAYS LEFT============== */
function getDaysLeft(expiryDate){
    const today=parseLocalDate(getTodayString());
    const expiry=parseLocalDate(expiryDate);
    if(!today||!expiry){
        return 0;
    }
    const difference=expiry.getTime() - today.getTime();
    return Math.ceil(difference /(1000 * 60 * 60 * 24));
}

/*============== DOCUMENT STATUS============== */
function getDocumentStatus(doc){
    const daysLeft=getDaysLeft(doc.expiryDate);
    if(daysLeft<0){
        return{ type:"expired",label:"Expired",daysLeft };
    }
    const reminderDays=doc.reminder?parseInt(doc.reminder,10):30;
    if(daysLeft<=reminderDays){
        return{ type:"soon",label:"Expiring Soon",daysLeft };
    }
    return{ type:"active",label:"Active",daysLeft };
}

/*============== AUTH============== */
function initializeAuth(){
    const showRegister=document.getElementById("showRegister");
    const showLogin=document.getElementById("showLogin");
    const loginForm=document.getElementById("loginForm");
    const registerForm=document.getElementById("registerForm");
    if(showRegister){
        showRegister.addEventListener("click",()=>{
            document.getElementById("loginView").classList.add("d-none");
            document.getElementById("registerView").classList.remove("d-none");
        });
    }
    if(showLogin){
        showLogin.addEventListener("click",()=>{
            document.getElementById("registerView").classList.add("d-none");
            document.getElementById("loginView").classList.remove("d-none");
        });
    }
    if(loginForm){
        loginForm.addEventListener("submit",handleLogin);
    }
    if(registerForm){
        registerForm.addEventListener("submit",handleRegister);
    }
}

/*============== REGISTER============== */
function handleRegister(event){
    event.preventDefault();
    const name=document.getElementById("registerName").value.trim();
    const email=document.getElementById("registerEmail").value.trim().toLowerCase();
    const phone=document.getElementById("registerPhone").value.trim();
    const password=document.getElementById("registerPassword").value;
    const confirmPassword=document.getElementById("registerConfirmPassword").value;
    if(name.length<2){
        showToast("Please enter a valid name.");
        return;
    }
    if(!isValidEmail(email)){
        showToast("Please enter a valid email address.");
        return;
    }
    if(!/^[6-9]\d{9}$/.test(phone)){
        showToast("Enter a valid Indian 10-digit mobile number starting with 6-9.");
        return;
    }
    if(password.length<6){
        showToast("Password must contain at least 6 characters.");
        return;
    }
    if(password!==confirmPassword){
        showToast("Password and confirm password do not match.");
        return;
    }
    const users=getUsers();
    const existingUser=users.find(user=>user.email===email);
    if(existingUser){
        showToast("An account with this email already exists.");
        return;
    }
    const newUser={
        id:generateId(),
        name,
        email,
        phone,
        password,
        address:"",
        about:"",
        createdAt:new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    localStorage.setItem(STORAGE.session,newUser.id);
    showToast("Account created successfully.");
    setTimeout(()=>{
        showApplication();
    },500);
}

/*============== LOGIN============== */
function handleLogin(event){
    event.preventDefault();
    const email=document.getElementById("loginEmail").value.trim().toLowerCase();
    const password=document.getElementById("loginPassword").value;
    if(!isValidEmail(email)){
        showToast("Please enter a valid email address.");
        return;
    }
    const users=getUsers();
    const isRegistered=users.some(item=>item.email===email);
    if(!isRegistered){
        showToast("User not registered");
        return;
    }
    const user=users.find(item=>item.email===email && item.password===password);
    if(!user){
        showToast("Invalid password.");
        return;
    }
    localStorage.setItem(STORAGE.session,user.id);
    showToast("Login successful.");
    setTimeout(()=>{
        showApplication();
    },400);
}

/*============== EMAIL VALIDATION============== */
function isValidEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/*============== SESSION============== */
function checkSession(){
    const user=getCurrentUser();
    if(user){
        showApplication();
    } else{
        showAuth();
    }
}

function showAuth(){
    document.getElementById("authSection").classList.remove("d-none");
    document.getElementById("appSection").classList.add("d-none");
}

function showApplication(){
    const user=getCurrentUser();
    if(!user){
        showAuth();
        return;
    }
    document.getElementById("authSection").classList.add("d-none");
    document.getElementById("appSection").classList.remove("d-none");
    updateUserInterface();
    renderDashboard();
    renderDocuments();
    renderCalendar();
    renderProfile();
}

/*============== LOGOUT============== */
function initializeNavigation(){
    document.querySelectorAll(".nav-item[data-page]").forEach(button=>{
        button.addEventListener("click",()=>{
            showPage(button.dataset.page,button.dataset.title);
        });
    });
    document.querySelectorAll("[data-page-link]").forEach(button=>{
        button.addEventListener("click",()=>{
            const page=button.dataset.pageLink;
            const nav=document.querySelector(`.nav-item[data-page="${page}"]`);
            showPage(page,nav?nav.dataset.title:"DocuTrack");
        });
    });
    document.querySelectorAll("[data-stat-filter]").forEach(card=>{
        card.addEventListener("click",()=>{
            const filter=card.dataset.statFilter;
            const nav=document.querySelector(`.nav-item[data-page="documentsPage"]`);
            showPage("documentsPage",nav?nav.dataset.title:"My Documents");
            const statusFilter=document.getElementById("statusFilter");
            if(statusFilter){
                statusFilter.value=filter;
                const categoryFilter=document.getElementById("categoryFilter");
                if(categoryFilter){
                    categoryFilter.value="all";
                }
                renderDocuments();
            }
        });
    });
}

function showPage(pageId,title){
    document.querySelectorAll(".page-section").forEach(page=>{
        page.classList.add("d-none");
    });
    const page=document.getElementById(pageId);
    if(page){
        page.classList.remove("d-none");
    }
    document.querySelectorAll(".nav-item[data-page]").forEach(item=>{
        item.classList.toggle("active",item.dataset.page===pageId);
    });
    const pageTitle=document.getElementById("pageTitle");
    if(pageTitle){
        pageTitle.textContent=title||"DocuTrack";
    }
    if(window.innerWidth<=991){
        document.getElementById("sidebar")?.classList.remove("mobile-open");
    }
    if(pageId==="dashboardPage"){
        renderDashboard();
    }
    if(pageId==="documentsPage"){
        renderDocuments();
    }
    if(pageId==="calendarPage"){
        renderCalendar();
    }
    if(pageId==="profilePage"){
        renderProfile();
    }
}

/*============== SIDEBAR============== */
function initializeSidebar(){
    const toggle=document.getElementById("sidebarToggle");
    const sidebar=document.getElementById("sidebar");
    const mainContent=document.getElementById("mainContent");
    const logoutBtn=document.getElementById("logoutBtn");
    if(toggle){
        toggle.addEventListener("click",()=>{
            if(window.innerWidth<=991){
                sidebar.classList.toggle("mobile-open");
            } else{
                sidebar.classList.toggle("collapsed");
                mainContent.classList.toggle("sidebar-collapsed");
            }
        });
    }
    if(logoutBtn){
        logoutBtn.addEventListener("click",logout);
    }
}

/*============== LOGOUT============== */
function logout(){
    showConfirm("Are you sure you want to logout?",()=>{
        localStorage.removeItem(STORAGE.session);
        document.getElementById("loginForm")?.reset();
        showAuth();
        showToast("You have been logged out.");
    });
}

/*============== PASSWORD EYE TOGGLE============== */
function initializePasswordToggles(){
    document.querySelectorAll(".password-toggle").forEach(button=>{
        button.addEventListener("click",()=>{
            const targetId=button.dataset.target;
            const input=document.getElementById(targetId);
            if(!input){
                return;
            }
            const icon=button.querySelector("i");
            if(input.type==="password"){
                input.type="text";
                icon.classList.remove("bi-eye-fill");
                icon.classList.add("bi-eye-slash-fill");
            } else{
                input.type="password";
                icon.classList.remove("bi-eye-slash-fill");
                icon.classList.add("bi-eye-fill");
            }
        });
    });
}

/*============== THEME============== */
function initializeTheme(){
    const savedTheme=localStorage.getItem(STORAGE.theme);
    if(savedTheme==="dark"){
        document.body.classList.add("dark-mode");
    } else{
        document.body.classList.remove("dark-mode");
    }
    updateThemeIcons();
}

function toggleTheme(){
    document.body.classList.toggle("dark-mode");
    const isDark=document.body.classList.contains("dark-mode");
    localStorage.setItem(STORAGE.theme,isDark?"dark":"light");
    updateThemeIcons();
}

function updateThemeIcons(){
    const isDark=document.body.classList.contains("dark-mode");
    const authButton=document.getElementById("authThemeBtn");
    if(authButton){
        const icon=authButton.querySelector("i");
        const text=document.getElementById("authThemeText");
        if(icon){
            icon.className=isDark?"bi bi-brightness-high-fill":"bi bi-moon-fill";
        }
        if(text){
            text.textContent=isDark?"Light Mode":"Dark Mode";
        }
        authButton.title=isDark?"Switch to light mode":"Switch to dark mode";
        authButton.setAttribute("aria-label",authButton.title);
    }
    const appButton=document.getElementById("appThemeBtn");
    if(appButton){
        const icon=appButton.querySelector("i");
        const text=document.getElementById("appThemeText");
        if(icon){
            icon.className=isDark?"bi bi-brightness-high-fill":"bi bi-moon-fill";
        }
        if(text){
            text.textContent=isDark?"Light Mode":"Dark Mode";
        }
    }
}

function initializeThemeButtons(){
    const authButton=document.getElementById("authThemeBtn");
    const appButton=document.getElementById("appThemeBtn");
    if(authButton){
        authButton.addEventListener("click",toggleTheme);
    }
    if(appButton){
        appButton.addEventListener("click",toggleTheme);
    }
}

/*============== USER INTERFACE============== */
function updateUserInterface(){
    const user=getCurrentUser();
    if(!user){
        return;
    }
    const initials=getInitials(user.name);
    const sidebarAvatar=document.getElementById("sidebarAvatar");
    const topAvatar=document.getElementById("topUserAvatar");
    const profileAvatar=document.getElementById("profileAvatar");
    if(sidebarAvatar){
        sidebarAvatar.textContent=initials;
    }
    if(topAvatar){
        topAvatar.textContent=initials;
    }
    if(profileAvatar){
        profileAvatar.textContent=initials;
    }
    setText("sidebarUserName",user.name);
    setText("sidebarUserEmail",user.email);
    setText("topUserName",user.name);
    setText("welcomeName",user.name.split(" ")[0]);
}

function getInitials(name){
    return name.split(" ").filter(Boolean).slice(0,2).map(word=>word[0].toUpperCase()).join("");
}

function setText(id,value){
    const element=document.getElementById(id);
    if(element){
        element.textContent=value||"";
    }
}

/*============== DASHBOARD============== */
function renderDashboard(){
    const documents=getDocuments();
    let active=0;
    let soon=0;
    let expired=0;
    documents.forEach(doc=>{
        const status=getDocumentStatus(doc);
        if(status.type==="active"){
            active++;
        }
        if(status.type==="soon"){
            soon++;
        }
        if(status.type==="expired"){
            expired++;
        }
    });
    setText("totalDocuments",documents.length);
    setText("activeDocuments",active);
    setText("soonDocuments",soon);
    setText("expiredDocuments",expired);
    renderExpiryAlerts();
    updateNotificationBadge();
    updateUserInterface();
}

/*============== EXPIRY ALERTS============== */
function renderExpiryAlerts(){
    const container=document.getElementById("expiryAlerts");
    if(!container){
        return;
    }
    const documents=getDocuments();
    const urgent=documents.filter(doc=>{
        const status=getDocumentStatus(doc);
        return(status.type==="expired"||status.type==="soon");
    }).sort((a,b)=>getDaysLeft(a.expiryDate) - getDaysLeft(b.expiryDate)).slice(0,5);
    if(urgent.length===0){
        container.innerHTML=`
            <div class="empty-state" style="padding:30px 10px;">
                <div class="empty-icon">
                    <i class="bi bi-check-circle-fill"></i>
                </div>
                <h4>Everything looks good</h4>
                <p>No documents need immediate attention.</p>
            </div>
        `;
        return;
    }
    container.innerHTML=urgent.map(doc=>{
        const status=getDocumentStatus(doc);
        let message="";
        let icon="";
        if(status.type==="expired"){
            message=`Expired ${Math.abs(status.daysLeft)} day(s) ago`;
            icon="bi-x-octagon-fill";
        } else{
            message=`Expires in ${status.daysLeft} day(s)`;
            icon="bi-hourglass-split";
        }
        return `
            <div class="expiry-alert ${status.type}">
                <div class="expiry-alert-left">
                    <div class="alert-icon">
                        <i class="bi ${icon}"></i>
                    </div>
                    <div>
                        <strong>${escapeHtml(doc.name)}</strong>
                        <span>${message} • ${formatDate(doc.expiryDate)}</span>
                    </div>
                </div>
                <button class="alert-action" data-view-alert="${doc.id}">View</button>
            </div>
        `;
    }).join("");
    container.querySelectorAll("[data-view-alert]").forEach(button=>{
        button.addEventListener("click",()=>{
            viewDocument(button.dataset.viewAlert);
        });
    });
}

/*============== DOCUMENT EVENTS============== */
function initializeDocumentEvents(){
    document.getElementById("dashboardAddBtn")?.addEventListener("click",()=>openDocumentModal());
    document.getElementById("quickAdd")?.addEventListener("click",()=>openDocumentModal());
    document.getElementById("addDocumentBtn")?.addEventListener("click",()=>openDocumentModal());
    document.getElementById("emptyAddDocument")?.addEventListener("click",()=>openDocumentModal());
    document.getElementById("documentForm")?.addEventListener("submit",saveDocument);
    const searchInput=document.getElementById("documentSearch");
    if(searchInput){
        searchInput.addEventListener("input",(e)=>{
            renderDocuments();
            const searchIcon=document.getElementById("searchIcon");
            if(searchIcon){
                if(e.target.value.trim().length>0){
                    searchIcon.classList.add("search-active");
                } else{
                    searchIcon.classList.remove("search-active");
                }
            }
        });
    }
    document.getElementById("categoryFilter")?.addEventListener("change",renderDocuments);
    document.getElementById("statusFilter")?.addEventListener("change",renderDocuments);
    const tableBody=document.getElementById("documentsTableBody");
    if(tableBody){
        tableBody.addEventListener("click",handleDocumentAction);
    }
}

/*============== OPEN ADD / EDIT MODAL============== */
function openDocumentModal(documentId=null){
    const form=document.getElementById("documentForm");
    const title=document.getElementById("documentModalTitle");
    if(!form||!documentModal){
        return;
    }
    form.reset();
    document.getElementById("documentId").value="";
    document.getElementById("documentReminder").value="";
    document.getElementById("documentIssueDate").value="";
    document.getElementById("documentExpiryDate").value="";
    if(!documentId){
        title.textContent="Add Document";
        documentModal.show();
        return;
    }
    const doc=getDocuments().find(item=>item.id===documentId);
    if(!doc){
        showToast("Document could not be found.");
        return;
    }
    title.textContent="Edit Document";
    document.getElementById("documentId").value=doc.id;
    document.getElementById("documentName").value=doc.name||"";
    document.getElementById("documentCategory").value=doc.category||"";
    document.getElementById("documentNumber").value=doc.documentNumber||"";
    document.getElementById("documentReminder").value=doc.reminder||"";
    document.getElementById("documentIssueDate").value=doc.issueDate||"";
    document.getElementById("documentExpiryDate").value=doc.expiryDate||"";
    document.getElementById("documentNotes").value=doc.notes||"";
    documentModal.show();
}

/*============== SAVE DOCUMENT============== */
function saveDocument(event){
    event.preventDefault();
    const id=document.getElementById("documentId").value;
    const name=document.getElementById("documentName").value.trim();
    const category=document.getElementById("documentCategory").value;
    const documentNumber=document.getElementById("documentNumber").value.trim();
    const reminder=document.getElementById("documentReminder").value;
    const issueDate=document.getElementById("documentIssueDate").value.trim();
    const expiryDate=document.getElementById("documentExpiryDate").value.trim();
    const notes=document.getElementById("documentNotes").value.trim();
    if(!name){
        showToast("Please enter the document name.");
        return;
    }
    if(!category){
        showToast("Please select a category.");
        return;
    }
    if(!reminder){
        showToast("Please choose a duration.");
        return;
    }
    if(!issueDate){
        showToast("Invalid date");
        return;
    }
    if(!expiryDate){
        showToast("Invalid date");
        return;
    }
    if(expiryDate<issueDate){
        showToast("Expiry date cannot be before issue date.");
        return;
    }
    const documents=getDocuments();
    const existingIndex=documents.findIndex(doc=>doc.id===id);
    const documentData={
        id:id||generateId(),
        name,
        category,
        documentNumber,
        reminder,
        issueDate,
        expiryDate,
        notes,
        updatedAt:new Date().toISOString()
    };
    if(existingIndex >= 0){
        documents[existingIndex]={...documents[existingIndex],...documentData };
        showToast("Document updated successfully.");
    } else{
        documents.push({ ...documentData,createdAt:new Date().toISOString() });
        showToast("Document added successfully.");
    }
    saveDocuments(documents);
    documentModal.hide();
    renderDashboard();
    renderDocuments();
    renderCalendar();
    renderProfile();
}

/*============== RENDER DOCUMENTS============== */
function renderDocuments(){
    const tableBody=document.getElementById("documentsTableBody");
    const emptyState=document.getElementById("documentEmptyState");
    if(!tableBody||!emptyState){
        return;
    }
    const search=(document.getElementById("documentSearch")?.value||"").trim().toLowerCase();
    const category=document.getElementById("categoryFilter")?.value||"all";
    const statusFilter=document.getElementById("statusFilter")?.value||"all";
    let documents=getDocuments();
    documents=documents.filter(doc=>{
        const status=getDocumentStatus(doc);
        const matchesSearch=!search||doc.name.toLowerCase().includes(search) ||(doc.documentNumber||"").toLowerCase().includes(search) ||(doc.category||"").toLowerCase().includes(search);
        const matchesCategory=category==="all"||doc.category===category;
        const matchesStatus=statusFilter==="all"||status.type===statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });
    documents.sort((a,b)=>getDaysLeft(a.expiryDate) - getDaysLeft(b.expiryDate));
    if(documents.length===0){
        tableBody.innerHTML="";
        emptyState.classList.remove("d-none");
        return;
    }
    emptyState.classList.add("d-none");
    tableBody.innerHTML=documents.map(doc=>{
        const status=getDocumentStatus(doc);
        let remainingText;
        if(status.type==="expired"){
            remainingText=`Expired ${Math.abs(status.daysLeft)}d ago`;
        } else if(status.daysLeft===0){
            remainingText="Expires today";
        } else{
            remainingText=`${status.daysLeft}d left`;
        }
        return `
            <tr>
                <td>
                    <div class="document-name-cell">
                        <div class="document-icon">
                            <i class="bi bi-file-earmark-medical-fill"></i>
                        </div>
                        <div>
                            <div class="document-name">${escapeHtml(doc.name)}</div>
                            ${doc.documentNumber?`<span class="document-number">${escapeHtml(doc.documentNumber)}</span>`:""}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-badge">${escapeHtml(doc.category)}</span>
                </td>
                <td>${formatDate(doc.issueDate)}</td>
                <td>
                    <strong>${formatDate(doc.expiryDate)}</strong>
                    <small style="display:block; color:var(--muted); margin-top:3px;">${remainingText}</small>
                </td>
                <td>
                    <span class="status-badge status-${status.type}">${status.label}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button type="button" class="action-btn" data-action="view" data-id="${doc.id}" title="View">
                            <i class="bi bi-eye-fill"></i>
                        </button>
                        <button type="button" class="action-btn" data-action="edit" data-id="${doc.id}" title="Edit">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button type="button" class="action-btn delete" data-action="delete" data-id="${doc.id}" title="Delete">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

/*============== DOCUMENT ACTION HANDLER============== */
function handleDocumentAction(event){
    const button=event.target.closest("[data-action]");
    if(!button){
        return;
    }
    const action=button.dataset.action;
    const id=button.dataset.id;
    if(!id){
        return;
    }
    if(action==="view"){
        viewDocument(id);
    }
    if(action==="edit"){
        openDocumentModal(id);
    }
    if(action==="delete"){
        deleteDocument(id);
    }
}

/*============== VIEW DOCUMENT============== */
function viewDocument(id){
    const doc=getDocuments().find(item=>item.id===id);
    if(!doc){
        showToast("Document could not be found.");
        return;
    }
    const status=getDocumentStatus(doc);
    let remaining;
    if(status.type==="expired"){
        remaining=`Expired ${Math.abs(status.daysLeft)} day(s) ago`;
    } else if(status.daysLeft===0){
        remaining="Expires today";
    } else{
        remaining=`${status.daysLeft} day(s) remaining`;
    }
    const content=document.getElementById("documentDetailsContent");
    if(!content){
        return;
    }
    content.innerHTML=`
        <div class="document-details-grid">
            <div class="detail-item">
                <span class="detail-label">Document Name</span>
                <div class="detail-value">${escapeHtml(doc.name)}</div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Category</span>
                <div class="detail-value">${escapeHtml(doc.category)}</div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Document Number</span>
                <div class="detail-value">${escapeHtml(doc.documentNumber||"Not provided")}</div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status</span>
                <div>
                    <span class="status-badge status-${status.type}">${status.label}</span>
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Issue Date</span>
                <div class="detail-value">${formatDate(doc.issueDate)}</div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Expiry Date</span>
                <div class="detail-value">${formatDate(doc.expiryDate)}</div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Remaining</span>
                <div class="detail-value">${remaining}</div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Reminder</span>
                <div class="detail-value">${escapeHtml(String(doc.reminder||""))} days before</div>
            </div>
            <div class="detail-item full">
                <span class="detail-label">Notes</span>
                <div class="detail-value">${doc.notes?escapeHtml(doc.notes):"No notes added."}</div>
            </div>
        </div>
    `;
    if(viewDocumentModal){
        viewDocumentModal.show();
    }
}

/*============== DELETE DOCUMENT============== */
function deleteDocument(id){
    const doc=getDocuments().find(item=>item.id===id);
    if(!doc){
        return;
    }
    showConfirm(`Are you sure you want to delete "${doc.name}"?`,()=>{
        const documents=getDocuments().filter(item=>item.id!==id);
        saveDocuments(documents);
        renderDashboard();
        renderDocuments();
        renderCalendar();
        renderProfile();
        showToast("Document deleted successfully.");
    });
}

/*============== CALENDAR============== */
function initializeCalendar(){
    document.getElementById("previousMonth")?.addEventListener("click",()=>{
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById("nextMonth")?.addEventListener("click",()=>{
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
    document.getElementById("todayBtn")?.addEventListener("click",()=>{
        currentCalendarDate=new Date();
        renderCalendar();
    });
}

/*============== RENDER CALENDAR============== */
function renderCalendar(){
    const calendarDays=document.getElementById("calendarDays");
    const title=document.getElementById("calendarMonthYear");
    if(!calendarDays||!title){
        return;
    }
    const year=currentCalendarDate.getFullYear();
    const month=currentCalendarDate.getMonth();
    title.textContent=new Date(year,month,1).toLocaleDateString("en-IN",{ month:"long",year:"numeric" });
    const firstDay=new Date(year,month,1).getDay();
    const daysInMonth=new Date(year,month + 1,0).getDate();
    const daysInPreviousMonth=new Date(year,month,0).getDate();
    const documents=getDocuments();
    const today=getTodayString();
    let html="";
    for(let i=firstDay - 1; i >= 0; i--){
        const day=daysInPreviousMonth - i;
        html+=`
            <div class="calendar-day other-month">
                <div class="calendar-number">${day}</div>
            </div>
        `;
    }
    for(let day=1; day<=daysInMonth; day++){
        const dateString=`${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        const events=documents.filter(doc=>doc.expiryDate===dateString);
        const isToday=dateString===today;
        html+=`
            <div class="calendar-day ${isToday?"today":""}" data-calendar-date="${dateString}">
                <div class="calendar-number">${day}</div>
                ${events.slice(0,2).map(doc=>`
                    <div class="calendar-event">${escapeHtml(doc.name)}</div>
                `).join("")}
            </div>
        `;
    }
    const totalCells=firstDay + daysInMonth;
    const remainingCells=totalCells % 7===0?0:7 -(totalCells % 7);
    for(let day=1; day<=remainingCells; day++){
        html+=`
            <div class="calendar-day other-month">
                <div class="calendar-number">${day}</div>
            </div>
        `;
    }
    calendarDays.innerHTML=html;
    calendarDays.querySelectorAll("[data-calendar-date]").forEach(cell=>{
        cell.addEventListener("click",()=>{
            calendarDays.querySelectorAll(".calendar-day").forEach(item=>item.classList.remove("selected"));
            cell.classList.add("selected");
            showCalendarDate(cell.dataset.calendarDate);
        });
    });
}

/*============== CALENDAR DATE DETAILS============== */
function showCalendarDate(dateString){
    const title=document.getElementById("selectedDateTitle");
    const details=document.getElementById("calendarDetails");
    if(!title||!details){
        return;
    }
    const documents=getDocuments().filter(doc=>doc.expiryDate===dateString);
    title.textContent=`Expiry Dates — ${formatDate(dateString)}`;
    if(documents.length===0){
        details.innerHTML=`
            <p class="muted-text">No documents expire on this date.</p>
        `;
        return;
    }
    details.innerHTML=documents.map(doc=>{
        const status=getDocumentStatus(doc);
        return `
            <div class="calendar-document">
                <div>
                    <strong>${escapeHtml(doc.name)}</strong>
                    <span>${escapeHtml(doc.category)}</span>
                </div>
                <span class="status-badge status-${status.type}">${status.label}</span>
            </div>
        `;
    }).join("");
}

/*============== PROFILE============== */
function initializeProfile(){
    const profileForm=document.getElementById("profileForm");
    if(profileForm){
        profileForm.addEventListener("submit",saveProfile);
    }
}

/*============== RENDER PROFILE============== */
function renderProfile(){
    const user=getCurrentUser();
    if(!user){
        return;
    }
    const initials=getInitials(user.name);
    setText("profileSummaryName",user.name);
    setText("profileSummaryEmail",user.email);
    const avatar=document.getElementById("profileAvatar");
    if(avatar){
        avatar.textContent=initials;
    }
    const createdDate=user.createdAt?new Date(user.createdAt):new Date();
    setText("memberSince",createdDate.toLocaleDateString("en-IN",{ month:"short",year:"numeric" }));
    setText("profileDocumentCount",getDocuments().length);
    document.getElementById("profileName").value=user.name||"";
    document.getElementById("profileEmail").value=user.email||"";
    document.getElementById("profilePhone").value=user.phone||"";
    document.getElementById("profileAddress").value=user.address||"";
    document.getElementById("profileAbout").value=user.about||"";
}

/*============== SAVE PROFILE============== */
function saveProfile(event){
    event.preventDefault();
    const currentUser=getCurrentUser();
    if(!currentUser){
        return;
    }
    const name=document.getElementById("profileName").value.trim();
    const email=document.getElementById("profileEmail").value.trim().toLowerCase();
    const phone=document.getElementById("profilePhone").value.trim();
    const address=document.getElementById("profileAddress").value.trim();
    const about=document.getElementById("profileAbout").value.trim();
    if(name.length<2){
        showToast("Please enter a valid name.");
        return;
    }
    if(!isValidEmail(email)){
        showToast("Please enter a valid email.");
        return;
    }
    if(!/^[6-9]\d{9}$/.test(phone)){
        showToast("Enter a valid Indian 10-digit phone number.");
        return;
    }
    const users=getUsers();
    const emailTaken=users.some(user=>user.email===email && user.id!==currentUser.id);
    if(emailTaken){
        showToast("This email is already used by another account.");
        return;
    }
    const index=users.findIndex(user=>user.id===currentUser.id);
    if(index===-1){
        return;
    }
    users[index]={...users[index],name,email,phone,address,about };
    saveUsers(users);
    updateUserInterface();
    renderProfile();
    renderDashboard();
    showToast("Profile updated successfully.");
}

/*============== NOTIFICATIONS============== */
function initializeQuickActions(){
    const notificationBtn=document.getElementById("notificationBtn");
    if(notificationBtn){
        notificationBtn.addEventListener("click",showNotifications);
    }
}

/*============== SHOW NOTIFICATIONS============== */
function showNotifications(){
    const documents=getDocuments();
    const expiringSoon=documents.filter(doc=>{
        const status=getDocumentStatus(doc);
        return status.type==="soon";
    });
    const expired=documents.filter(doc=>{
        const status=getDocumentStatus(doc);
        return status.type==="expired";
    });
    const total=expiringSoon.length + expired.length;
    if(total===0){
        showToast("You have no expiring soon or expired documents.");
        return;
    }
    let detailMsg=`<strong>${total} document(s) need attention:</strong><br><br>`;
    if(expired.length>0){
        detailMsg+=`<span style="color:var(--danger)"><strong>Expired:</strong></span><br>`;
        expired.forEach(doc=>{
            detailMsg+=`<span style="font-size:13px;">• ${escapeHtml(doc.name)}(${formatDate(doc.expiryDate)})</span><br>`;
        });
        detailMsg+=`<br>`;
    }
    if(expiringSoon.length>0){
        detailMsg+=`<span style="color:var(--warning)"><strong>Expiring Soon:</strong></span><br>`;
        expiringSoon.forEach(doc=>{
            detailMsg+=`<span style="font-size:13px;">• ${escapeHtml(doc.name)}(${formatDate(doc.expiryDate)})</span><br>`;
        });
    }
    showToast(detailMsg,true);
}

/*============== NOTIFICATION BADGE============== */
function updateNotificationBadge(){
    const badge=document.getElementById("notificationBadge");
    if(!badge){
        return;
    }
    const documents=getDocuments();
    const urgentCount=documents.filter(doc=>{
        const status=getDocumentStatus(doc);
        return(status.type==="expired"||status.type==="soon");
    }).length;
    if(urgentCount>0){
        badge.textContent=urgentCount>99?"99+":urgentCount;
        badge.classList.remove("d-none");
    } else{
        badge.classList.add("d-none");
    }
}

/*============== TOAST============== */
function showToast(message,isHtml=false){
    const toastMessage=document.getElementById("toastMessage");
    if(toastMessage){
        if(isHtml){
            toastMessage.innerHTML=message;
        } else{
            toastMessage.textContent=message;
        }
    }
    if(appToast){
        appToast.show();
    } else{
        const plainText=isHtml?message.replace(/<br>/g,'\n').replace(/<[^>]+>/g,''):message;
        alert(plainText);
    }
}

/*============== ESCAPE HTML============== */
function escapeHtml(value){
    return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}