import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  @Output() continue: EventEmitter<any> = new EventEmitter<any>();
  username: string = '';
  password: string = '';
  isLoggedIn: boolean = false;

  onContinue() {
    if (this.username && this.password) { // Check if username and password are filled
      // Add your login logic here

      // Simulating successful login
      this.isLoggedIn = true;

      // Emit the continue event
      this.continue.emit();
    } else {
      alert('Please fill in all the fields.');
    }
  }
}
/*
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  @Output() continue: EventEmitter<any> = new EventEmitter<any>();
  username: string = ''; // Add the username property
  password: string = ''; // Add the password property
  isLoggedIn: boolean = false;

  onContinue() {
    // Add your login logic here

    // Simulating successful login
    this.isLoggedIn = true;

    // Emit the continue event
    this.continue.emit();
  }
}

*/