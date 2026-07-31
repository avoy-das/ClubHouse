const Card = ({ children, className = '', ...props }) => {
    return (
        <div
            className={`bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 transition-all hover:shadow-md ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
