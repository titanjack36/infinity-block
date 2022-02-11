import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnInit {
  
  @Input() showModal: boolean = true;
  @Output() onHideModal = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

  closeModal(): void {
    this.onHideModal.emit();
  }

  @HostListener('document:keyup', ['$event'])
  handleKeypress(event: KeyboardEvent) {
    if (this.showModal && event.key == "Escape") {
      this.closeModal();
    }
  }
}
