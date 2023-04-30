
var toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
  ['blockquote', 'code-block'],

  [{ 'header': 1 }, { 'header': 2 }],               // custom button values
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
  [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
  [{ 'direction': 'rtl' }],                         // text direction

  [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
  [{ 'font': [] }],
  [{ 'align': [] }],

  ['clean']                                         // remove formatting button
];
var quill;
function loadEditor(){
  const isLinked = Boolean(document.getElementById("isLinked").value);
  
  var options = {
    modules: {
      toolbar:toolbarOptions
    },
    placeholder: 'Select a note to edit or click Create New Note',
    readOnly: true,
    scrollingContainer: '#scrolling-container', 
    theme: 'snow'
  };
  if(!isLinked){
    options.placeholder = "Link to MyDrive to create and edit notes";
    options.readOnly = true;
  }
  quill = new Quill('#quill-container', options);
  const toolbarElem = document.getElementsByClassName("ql-toolbar")[0];
  const block = document.createElement("span");
  block.className = "ql-formats";
  const saveButton = document.createElement("button");
  saveButton.type="button";
  saveButton.className="ql-save";
  
  saveButton.innerHTML='<svg style="width:18px;height:18px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--! Font Awesome Pro 6.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path class="custom-toolbar-button" d="M48 96V416c0 8.8 7.2 16 16 16H384c8.8 0 16-7.2 16-16V170.5c0-4.2-1.7-8.3-4.7-11.3l33.9-33.9c12 12 18.7 28.3 18.7 45.3V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96C0 60.7 28.7 32 64 32H309.5c17 0 33.3 6.7 45.3 18.7l74.5 74.5-33.9 33.9L320.8 84.7c-.3-.3-.5-.5-.8-.8V184c0 13.3-10.7 24-24 24H104c-13.3 0-24-10.7-24-24V80H64c-8.8 0-16 7.2-16 16zm80-16v80H272V80H128zm32 240a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z"/></svg>';
  saveButton.addEventListener("click",function(evt){
    saveData(quill.getContents());
  });
  block.appendChild(saveButton);
  toolbarElem.insertBefore(block,toolbarElem.firstChild);

  document.getElementsByClassName("ql-editor")[0].classList.add("z-depth-2");
}
function saveDataAPEX(data){
  startClientAgent("register",data);
}
var useAPEX=true;
function saveData(data){
  if(useAPEX){
    saveDataAPEX(data);
    return;
  }
  var url = "/notes/save";
  uploadData = {};
  uploadData["data"]=data;
  uploadData["name"]=currentNote;
  fetch(url,{
  body:JSON.stringify(uploadData),
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
  }})
  .then((response) => response.json())
  .then((data) => saveResponse(data));
}
function saveResponse(data){
  if(data["success"]==true){
    M.toast({html: 'File Saved!', classes: 'rounded'});
  }
}
function loadFiles(){
  const isLinked = Boolean(document.getElementById("isLinked").value);
  if(isLinked){
    refreshNotesList();
  }
}
function refreshNotesList(){
  
  var url = "/notes/list";
  fetch(url)
    .then((response) => response.json())
    .then((data) => updateList(data));
}
function updateList(data){
  const menu = document.getElementById("slide-out");
  const existing = menu.getElementsByClassName("note-file");
  while(existing.length > 0){
    existing[0].parentNode.removeChild(existing[0]);
  }
  for(const child of data.children){
    if(child.type=="file" && child.name.endsWith(".note")){
      const menuItem = document.createElement("li");
      const link = document.createElement("a");
      link.className= "note-file";
      link.innerText = child.name.replace(".note","");
      link.dataset["name"] = child.name;
      link.addEventListener("click",function(evt){
        setActiveNote(this);
        getNote(child.name+"");
      });
      menuItem.appendChild(link);
      menu.appendChild(menuItem);
    }
  }

}
var currentNote="";
function setActiveNote(target){
  const menu = document.getElementById("slide-out");
  var elems = menu.getElementsByClassName("active");
  for(const elem of elems){
    elem.classList.remove("active");
  }
  target.parentNode.classList.add("active");
  currentNote = target.dataset.name;

}
function getNote(name){
  var target = name;
  var url = "/notes/note?" + new URLSearchParams({name: target});
    
  
  fetch(url)
    .then((response) => response.json())
    .then((data) => updateEditor(data));
}
function updateEditor(data){
  console.log(data);
  if(JSON.stringify(data) == "{}"){
    document.getElementsByClassName("ql-editor")[0].dataset.placeholder="Empty note, click here to start editing";
  }
  quill.setContents(data);
  quill.enable();
}
function createNewNote(){
  var newNoteName = window.prompt("Enter new note name");
  if(newNoteName!=null){
    newNoteName = newNoteName + ".note";
    var url = "/notes/create";
    uploadData = {};
    uploadData["name"]=newNoteName;
  fetch(url,{
    body:JSON.stringify(uploadData),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    }})
    .then((response) => response.json())
    .then((data) => updateList(data));
  }
}
function startLink(){
  var url = "/link";
  fetch(url)
    .then((response) => response.json())
    .then((data) => showOTP(data));
}
function showOTP(resp){
  document.getElementById("otpCode").innerText=resp.otp;
  
  var instance = M.Modal.getInstance(document.getElementById("otpModal"));
  instance.open();
}
function proceedWithLinking(){
  //var left = (screen.width/2)-(500/2);
  //var top = (screen.height/2)-(500/2);
  //window.open("/link-authorise","AuthoriseWindow","width=500px,height=500px, top="+top+", left="+left);
  window.location = "/link-authorise";
}
document.addEventListener('DOMContentLoaded', function() {

  var elems = document.querySelectorAll('.modal');
  var instances = M.Modal.init(elems);
});
