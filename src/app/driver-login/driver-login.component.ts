import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-driver-login',
  templateUrl: './driver-login.component.html',
  styleUrls: ['./driver-login.component.css'],
})
export class DriverLoginComponent {
  email = '';
  password = '';

  @Output() continue = new EventEmitter<void>();

  onSubmit() {
    if (this.email && this.password) { // Check if email and password are filled
      // Perform driver login authentication
      // ...
      // If login is successful, emit the 'continue' event
      this.continue.emit();
    } else {
      alert('Please fill in all the fields.');
    }
  }
}