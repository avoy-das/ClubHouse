import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { getImageUrl } from '../../utils/imageUrl';

const ClubCard = ({ club }) => {
    const logoUrl = getImageUrl(club.logo_url || club.logo_path);

    return (
        <Card className="flex flex-col justify-between hover:shadow-lg transition">
            <div>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl overflow-hidden border">
                            {logoUrl ? (
                                <img src={logoUrl} alt={club.name} className="w-full h-full object-cover" />
                            ) : (
                                club.name?.substring(0, 2).toUpperCase() || 'CH'
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900 leading-snug">{club.name}</h3>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded capitalize">
                                {club.category || 'General'}
                            </span>
                        </div>
                    </div>
                    {club.status && <Badge status={club.status} />}
                </div>
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                    {club.description || 'No description provided for this club.'}
                </p>
            </div>
            <div className="pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-gray-500">
                    {club.members_count !== undefined ? `${club.members_count} Members` : ''}
                </span>
                <Link to={`/clubs/${club.id}`}>
                    <Button variant="primary" size="sm">
                        View Details →
                    </Button>
                </Link>
            </div>
        </Card>
    );
};

export default ClubCard;
