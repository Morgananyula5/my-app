import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  showLoginComponent = false;
  showSignupComponent = false;
  showDriverLoginComponent = false;
  showDriverSignupComponent = false;
  isLoggedIn = false;
  isDriver = false;

  onLoginContinue() {
    this.showLoginComponent = false;
    this.isLoggedIn = true;
    this.isDriver = false;
  }

  onSignupContinue() {
    this.showSignupComponent = false;
    this.isLoggedIn = true;
    this.isDriver = false;
  }

  onDriverLoginContinue() {
    this.showDriverLoginComponent = false;
    this.isLoggedIn = true;
    this.isDriver = true;
  }

  onDriverSignupContinue() {
    this.showDriverSignupComponent = false;
    this.isLoggedIn = true;
    this.isDriver = true;
  }

  onLogout() {
    this.isLoggedIn = false;
    this.isDriver = false;
  }
}

  /*
  EXAMPLE 1
  Servername = 'Apollo';
  ServerPID = 10;
  ServerStatus ='offline';
  statusFlag= false;
  buttonState = true;
  constructor(){
    setTimeout(() => {
      this.buttonState = false;
    },2500);
  }

  toggleServerStatus(){

    this.statusFlag=!this.statusFlag;
    if(this.statusFlag === true){

      this.ServerStatus='online';
    } else{
      this.ServerStatus='offline';
    }
    return this.ServerStatus;
  }
  */




/*
EXAMPLE 2
name='';
state = false;

resetName(){
  this.name= '';
}

 checkName() {

  if (this.name ==='') {
    this.state = true;
    return this.state;
    
  }
}
*/


/*
flag = true;

toggleFlag () {
  this.flag = !this.flag;
  return this.flag;
}

getColor() {
  if(this.flag === true){
    return 'green';
  } else {
    return'red';
  }
}
}
*/

