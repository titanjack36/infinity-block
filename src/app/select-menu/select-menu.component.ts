import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-select-menu',
  templateUrl: './select-menu.component.html',
  styleUrls: ['./select-menu.component.css']
})
export class SelectMenuComponent implements OnInit {

  @Input() options: Option[] = [];
  selectedOption: Option | undefined;
  @Input() selectedValue: any;
  @Output() selectedValueChange = new EventEmitter<any>();
  @Output() onSelection = new EventEmitter<void>();

  dropdownOpen: boolean = false;

  hasClickedInside: boolean = false;
  @HostListener('click')
  handleClickInside() {
    this.hasClickedInside = true;
  }

  @HostListener('document:click')
  handleClickOutside() {
    if (this.hasClickedInside) {
      this.hasClickedInside = false;
    } else {
      this.hideDropdown();
    }
  }

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.selectedOption = this.options.find(option => option.value == this.selectedValue);
  }

  handleSelectOption(option: Option): void {
    this.selectedOption = option;
    this.selectedValue = option.value;
    this.selectedValueChange.emit(this.selectedValue);
    this.onSelection.emit();
    this.hideDropdown();
    this.cdr.detectChanges();
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  hideDropdown(): void {
    this.dropdownOpen = false;
  }
}

export interface Option {
  value: any;
  description: string; 
}