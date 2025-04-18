// src/renderer/components/CustomSelect.tsx
import React, { useState, useRef, useEffect, ReactNode } from 'react';
import './CustomSelect.css'; // We'll create this CSS file next

interface CustomSelectOption<T extends string> {
  value: T;
  label: ReactNode; // Allow JSX for labels if needed
}

interface CustomSelectProps<T extends string> {
  options: CustomSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  labelId?: string; // For accessibility
}

function CustomSelect<T extends string>({
  options,
  value,
  onChange,
  labelId,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.value === value);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    // Cleanup listener on unmount or when isOpen changes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOptionClick = (optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="custom-select-container" ref={selectRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={labelId} // Link to external label if provided
      >
        {selectedOption?.label || 'Select...'}
        <span className="custom-select-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <ul
          className="custom-select-options"
          role="listbox"
          aria-activedescendant={value} // Indicate current selection
          aria-labelledby={labelId}
        >
          {options.map(option => (
            <li
              key={option.value}
              className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option.value)}
              role="option"
              aria-selected={option.value === value}
              id={option.value} // Used for aria-activedescendant
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CustomSelect;